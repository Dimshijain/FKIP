import os
import hashlib
from sqlalchemy.orm import Session
from PyPDF2 import PdfReader
from app.db.models import Document, DocumentChunk, IngestionStatus
from app.services.vector import vector_service
import logging

logger = logging.getLogger(__name__)

def compute_file_hash(file_path: str) -> str:
    hasher = hashlib.sha256()
    with open(file_path, 'rb') as f:
        buf = f.read(65536)
        while len(buf) > 0:
            hasher.update(buf)
            buf = f.read(65536)
    return hasher.hexdigest()

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        reader = PdfReader(file_path)
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
    except Exception as e:
        logger.error(f"Error reading PDF {file_path}: {str(e)}")
        raise e
    return text

def extract_text_from_txt(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

def clean_extracted_text(text: str) -> str:
    if not text:
        return ""
    # Normalize line breaks and unprintable characters
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Collapse multiple consecutive newlines (more than 2) into double newline
    import re
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Strip leading/trailing whitespace
    return text.strip()

def recursive_chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[str]:
    cleaned = clean_extracted_text(text)
    if not cleaned:
        return []

    if len(cleaned) <= chunk_size:
        return [cleaned]

    # Split into paragraphs first
    paragraphs = [p.strip() for p in cleaned.split("\n\n") if p.strip()]
    
    # If paragraphs are huge, break them by sentences or lines
    units = []
    for p in paragraphs:
        if len(p) <= chunk_size:
            units.append(p)
        else:
            # Split paragraph into sentences/lines
            lines = [l.strip() for l in p.split("\n") if l.strip()]
            for l in lines:
                if len(l) <= chunk_size:
                    units.append(l)
                else:
                    # Break long line by period boundaries or spaces
                    import re
                    sentences = re.split(r'(?<=[.!?]) +', l)
                    for s in sentences:
                        if s.strip():
                            units.append(s.strip())

    chunks = []
    current_chunk = ""

    for unit in units:
        if not current_chunk:
            current_chunk = unit
        elif len(current_chunk) + len(unit) + 2 <= chunk_size:
            current_chunk += "\n\n" + unit
        else:
            chunks.append(current_chunk.strip())
            # Maintain overlap from end of current_chunk
            if overlap > 0 and len(current_chunk) > overlap:
                overlap_text = current_chunk[-overlap:]
                current_chunk = overlap_text + "\n\n" + unit
            else:
                current_chunk = unit

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks

def process_document(document_id: str, db: Session):
    db_doc = db.query(Document).filter(Document.id == document_id).first()
    if not db_doc:
        logger.error(f"Document {document_id} not found in database.")
        return

    try:
        db_doc.status = IngestionStatus.PROCESSING
        db.commit()
        
        file_path = db_doc.file_path
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found at {file_path}")

        # Extract text based on type
        ext = db_doc.file_type.lower()
        if ext == "pdf":
            text = extract_text_from_pdf(file_path)
        elif ext in ["txt", "docx", "csv"]: # basic text-based extraction for now
            text = extract_text_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

        if not text.strip():
            raise ValueError("No text content could be extracted from document.")

        # Segment text into chunks
        chunks = recursive_chunk_text(text)
        if not chunks:
            raise ValueError("Document was parsed, but generated no text chunks.")

        # Batch write chunks to PostgreSQL and Weaviate
        weaviate_chunks = []
        for idx, chunk_content in enumerate(chunks):
            # Save chunk in relational store
            db_chunk = DocumentChunk(
                document_id=db_doc.id,
                chunk_index=idx,
                chunk_content=chunk_content,
                token_count=len(chunk_content.split()) # simple word token count estimation
            )
            db.add(db_chunk)
            db.flush() # populates db_chunk.id

            weaviate_chunks.append({
                "document_id": db_doc.id,
                "file_name": db_doc.filename,
                "chunk_index": idx,
                "content": chunk_content,
                "author": db_doc.author or ""
            })

        # Commit relational records
        db.commit()

        # Batch upload to Weaviate
        vector_service.index_chunks(weaviate_chunks)

        # Update document status to complete
        db_doc.status = IngestionStatus.COMPLETED
        db.commit()
        logger.info(f"Successfully processed document {db_doc.filename}")

    except Exception as e:
        db.rollback()
        db_doc.status = IngestionStatus.FAILED
        db_doc.error_message = str(e)
        db.commit()
        logger.error(f"Failed to process document {document_id}: {str(e)}")
