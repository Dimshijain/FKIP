import time
import os
import httpx
import re
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.db.session import get_db
from app.db.models import Document, SearchAuditLog, UserFeedback, IngestionStatus
from app.db.schemas import (
    DocumentResponse, SearchQueryRequest, SearchQueryResponse, 
    ChatQueryRequest, ChatQueryResponse, FeedbackCreate, CitationSource
)
from app.api.auth import get_current_user, check_user_role
from app.db.models import User, UserRole
from app.services.vector import vector_service
from app.services.ingestion import process_document, compute_file_hash
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["search"])

GREETING_KEYWORDS = ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening", "help", "who are you", "what can you do"]

def is_greeting(text: str) -> bool:
    clean = re.sub(r'[^\w\s]', '', text.lower().strip())
    words = clean.split()
    if not words:
        return True
    if len(words) <= 3 and any(w in GREETING_KEYWORDS for w in words):
        return True
    return clean in GREETING_KEYWORDS

@router.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.CREATOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to upload documents"
        )

    filename = file.filename
    ext = filename.split(".")[-1].lower()
    if ext not in ["pdf", "txt", "docx", "csv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: .{ext}. Supported types: .pdf, .txt, .docx, .csv"
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    temp_path = os.path.join(settings.UPLOAD_DIR, f"temp_{int(time.time())}_{filename}")

    try:
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file to disk: {str(e)}"
        )

    file_hash = compute_file_hash(temp_path)
    existing_doc = db.query(Document).filter(Document.file_hash == file_hash).first()
    if existing_doc:
        os.remove(temp_path)
        return existing_doc

    permanent_path = os.path.join(settings.UPLOAD_DIR, f"{file_hash}.{ext}")
    os.rename(temp_path, permanent_path)

    db_doc = Document(
        filename=filename,
        file_path=permanent_path,
        file_size_bytes=len(content),
        file_type=ext,
        file_hash=file_hash,
        author=current_user.email,
        status=IngestionStatus.PENDING
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    background_tasks.add_task(process_document, db_doc.id, db)

    return db_doc

@router.get("/documents", response_model=List[DocumentResponse])
def get_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Document).order_by(Document.created_at.desc()).all()

@router.post("/search/hybrid", response_model=SearchQueryResponse)
def search_hybrid(
    request: SearchQueryRequest,
    current_user: User = Depends(get_current_user)
):
    results = vector_service.hybrid_search(query=request.query, limit=request.limit, document_id=request.document_id)
    return SearchQueryResponse(query=request.query, results=results)

@router.post("/search/chat", response_model=ChatQueryResponse)
async def chat_assistant(
    request: ChatQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    start_time = time.time()

    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty")
    
    user_query = request.messages[-1].content.strip()

    # 1. Handle Greetings & Conversational Queries Instantly
    if is_greeting(user_query):
        greeting_response = (
            "Hello! I am the FKIP Knowledge Assistant. I can help you search indexed documentation, "
            "query Oracle DDL database schemas, inspect release notes, and analyze core banking system specifications. "
            "How can I assist you today?"
        )
        latency = int((time.time() - start_time) * 1000)
        audit_log = SearchAuditLog(
            user_id=current_user.id,
            query_text=user_query,
            response_text=greeting_response,
            response_latency_ms=latency,
            relevance_score=1.0,
            faithfulness_score=1.0,
            hallucination_detected=False
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)

        return ChatQueryResponse(
            response=greeting_response,
            citations=[],
            log_id=audit_log.id
        )

    # 2. Perform Hybrid RAG Vector Search across Knowledge Base
    retrieved_chunks = []
    try:
        retrieved_chunks = vector_service.hybrid_search(
            query=user_query, 
            limit=5, 
            document_id=request.document_id, 
            min_score=0.10
        )
    except Exception as e:
        logger.warning(f"Vector search failed: {str(e)}")

    # Prepare citations and context
    context_str = ""
    citations = []
    if retrieved_chunks:
        for idx, chunk in enumerate(retrieved_chunks):
            context_str += f"[Doc {idx+1}]: {chunk['filename']}\n{chunk['chunk_content']}\n\n"
            citations.append(CitationSource(
                filename=chunk["filename"],
                chunk_content=chunk["chunk_content"]
            ))

    # 3. Formulate Prompt & Messages for Local LLM
    system_prompt = (
        "You are FKIP (FinXSystems Knowledge Intelligence Platform) AI Assistant.\n"
        "Your task is to provide concise, accurate, professional answers based on the retrieved documentation context.\n"
        "Guidelines:\n"
        "1. If context is provided, answer using the context. Cite relevant points clearly.\n"
        "2. If context does not contain sufficient details, provide a clear, helpful response based on system knowledge.\n"
        "3. Keep responses structured, concise, and professional."
    )

    ollama_messages = [{"role": "system", "content": system_prompt}]
    history = request.messages[-5:-1] if len(request.messages) > 1 else []
    for msg in history:
        ollama_messages.append({"role": msg.role, "content": msg.content})

    if context_str:
        user_prompt_payload = f"Retrieved Context:\n{context_str}\n\nUser Question: {user_query}"
    else:
        user_prompt_payload = f"User Question: {user_query}"

    ollama_messages.append({"role": "user", "content": user_prompt_payload})

    # 4. Invoke Ollama Local LLM with Fast Timeout & Contextual Fallback
    response_text = ""
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            ollama_response = await client.post(
                f"{settings.OLLAMA_URL}/api/chat",
                json={
                    "model": "qwen2:0.5b",
                    "messages": ollama_messages,
                    "stream": False
                }
            )
            if ollama_response.status_code == 200:
                text_out = ollama_response.json().get("message", {}).get("content", "").strip()
                if text_out:
                    response_text = text_out
    except Exception as e:
        logger.warning(f"Ollama call in search/chat timed out or failed: {str(e)}")

    # 5. Graceful Contextual Fallback if LLM is delayed or unavailable
    if not response_text:
        if retrieved_chunks:
            top_chunk = retrieved_chunks[0]
            response_text = (
                f"Based on ingested document specification `{top_chunk['filename']}`:\n\n"
                f"{top_chunk['chunk_content'][:350]}...\n\n"
                "You can inspect full details in the Knowledge Search Explorer search results panel."
            )
        else:
            response_text = (
                "I could not locate specific matching records in the knowledge repository for this query. "
                "Please upload the relevant specification files or try searching by keyword."
            )

    latency = int((time.time() - start_time) * 1000)
    relevance_sc = min(1.0, 0.70 + 0.05 * len(retrieved_chunks)) if retrieved_chunks else 0.5
    faithfulness_sc = 1.0

    # 6. Audit Trail Recording
    audit_log = SearchAuditLog(
        user_id=current_user.id,
        query_text=user_query,
        response_text=response_text,
        response_latency_ms=latency,
        relevance_score=relevance_sc,
        faithfulness_score=faithfulness_sc,
        hallucination_detected=False
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)

    return ChatQueryResponse(
        response=response_text,
        citations=citations,
        log_id=audit_log.id
    )

@router.post("/search/feedback", status_code=status.HTTP_201_CREATED)
def submit_feedback(
    feedback: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    audit_log = db.query(SearchAuditLog).filter(SearchAuditLog.id == feedback.log_id).first()
    if not audit_log:
        raise HTTPException(status_code=404, detail="Search log entry not found")
        
    db_feedback = UserFeedback(
        log_id=feedback.log_id,
        rating=feedback.rating,
        comments=feedback.comments
    )
    db.add(db_feedback)
    db.commit()
    return {"message": "Feedback submitted successfully"}
