import time
import os
import httpx
import re
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

router = APIRouter(tags=["search"])

FKIP_DOMAIN_KEYWORDS = [
    "fkip", "finxsystems", "finx", "knowledge intelligence", "core banking",
    "weaviate", "ollama", "postgresql", "postgres", "oracle", "dna_",
    "dna application", "document chunk", "hybrid search", "semantic search",
    "knowledge graph", "ai copilot", "retrieval augmented", "embedding",
    "vector", "ingestion", "rbac", "user role", "jwt", "hs256", "bcrypt",
    "/api/", "fastapi backend", "frontend port", "upload documents",
    "documentation generator", "brd", "srs", "technical design",
    "innovation pipeline", "opportunity ticket", "kanban",
    "capability cluster", "er diagram", "entity relationship diagram",
    "impact analysis", "ddl script", "oracle metadata", "database dependency",
    "password security", "text chunking", "fusion type", "all-minilm",
    "qwen2", "llama3", "document_chunks", "dna_applications",
    "dna_app_features", "oracle_metadata", "oracle_dependencies",
    "copilot_conversations", "copilot_messages", "generated_documents",
    "user_feedback", "search_audit_logs", "innovation_opportunities",
    "admin@finxsystems.com", "creator@finxsystems.com", "consumer@finxsystems.com"
]

def classify_question(question: str) -> str:
    q_lower = question.lower().strip()
    for kw in FKIP_DOMAIN_KEYWORDS:
        if kw in q_lower:
            return "FKIP_DOMAIN"
    return "GENERAL_OR_OUT_OF_DOMAIN"

@router.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce write access (ADMIN or CREATOR)
    if current_user.role not in [UserRole.ADMIN, UserRole.CREATOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to upload documents"
        )

    # Clean and check file extension
    filename = file.filename
    ext = filename.split(".")[-1].lower()
    if ext not in ["pdf", "txt", "docx", "csv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: .{ext}. Supported types: .pdf, .txt, .docx, .csv"
        )

    # Ensure uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    temp_path = os.path.join(settings.UPLOAD_DIR, f"temp_{int(time.time())}_{filename}")

    # Write file to disk temporarily to calculate hash
    try:
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file to disk: {str(e)}"
        )

    # Compute file hash to prevent duplicates
    file_hash = compute_file_hash(temp_path)
    existing_doc = db.query(Document).filter(Document.file_hash == file_hash).first()
    if existing_doc:
        # Delete temporary file
        os.remove(temp_path)
        return existing_doc

    # Rename temp file to permanent hash-based path
    permanent_path = os.path.join(settings.UPLOAD_DIR, f"{file_hash}.{ext}")
    os.rename(temp_path, permanent_path)

    # Record in database
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

    # Add ingestion to background processing task list
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

    # 1. Fetch latest user query
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages list cannot be empty")
    
    user_query = request.messages[-1].content

    # 2. Classify the question domain
    domain = classify_question(user_query)

    if domain != "FKIP_DOMAIN":
        # For general tech or out-of-domain questions, answer directly without RAG context
        system_prompt = (
            "You are FKIP (FinXSystems Knowledge Intelligence Platform) AI Assistant.\n"
            "Guidelines:\n"
            "1. Answer the user's question using your general knowledge.\n"
            "2. Do NOT mention FKIP, FinXSystems, finance reconciliation, Core Banking, Weaviate, Ollama, "
            "or any enterprise features unless the user explicitly asks about them.\n"
            "3. For simple factual questions (capital cities, science facts, etc.), give a direct correct answer.\n"
            "4. If you are unsure, state that you do not know.\n"
            "5. Keep answers concise and accurate."
        )
        ollama_messages = [{"role": "system", "content": system_prompt}]
        history = request.messages[-5:-1] if len(request.messages) > 1 else []
        for msg in history:
            ollama_messages.append({"role": msg.role, "content": msg.content})
        ollama_messages.append({"role": "user", "content": user_query})

        response_text = ""
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                ollama_response = await client.post(
                    f"{settings.OLLAMA_URL}/api/chat",
                    json={"model": settings.LLM_MODEL, "messages": ollama_messages, "stream": False}
                )
                if ollama_response.status_code == 200:
                    response_text = ollama_response.json().get("message", {}).get("content", "")
                else:
                    response_text = "Communication with local LLM failed."
        except Exception as e:
            response_text = f"AI Assistant error: {str(e)}"

        latency = int((time.time() - start_time) * 1000)
        audit_log = SearchAuditLog(
            user_id=current_user.id,
            query_text=user_query,
            response_text=response_text,
            response_latency_ms=latency,
            relevance_score=0.0,
            faithfulness_score=1.0,
            hallucination_detected=False
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)

        return ChatQueryResponse(
            response=response_text,
            citations=[],
            log_id=audit_log.id
        )

    # For FKIP domain: use RAG with document context
    # 3. Retrieve top-5 chunks from Weaviate with minimum relevance threshold
    retrieved_chunks = vector_service.hybrid_search(query=user_query, limit=5, document_id=request.document_id, min_score=0.35)

    # 4. Handle case where no relevant chunks are found
    if not retrieved_chunks:
        fallback_msg = "I cannot find the answer in the ingested documents. Please upload the relevant files to the knowledge repository."
        latency = int((time.time() - start_time) * 1000)
        audit_log = SearchAuditLog(
            user_id=current_user.id,
            query_text=user_query,
            response_text=fallback_msg,
            response_latency_ms=latency,
            relevance_score=0.0,
            faithfulness_score=1.0,
            hallucination_detected=False
        )
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)

        return ChatQueryResponse(
            response=fallback_msg,
            citations=[],
            log_id=audit_log.id
        )

    # 5. Assemble prompt context
    context_str = ""
    citations = []
    for idx, chunk in enumerate(retrieved_chunks):
        context_str += f"[Doc {idx+1}]: {chunk['filename']}\n{chunk['chunk_content']}\n\n"
        citations.append(CitationSource(
            filename=chunk["filename"],
            chunk_content=chunk["chunk_content"]
        ))

    # 6. Formulate System Prompt instructions
    system_prompt = (
        "You are FKIP (FinXSystems Knowledge Intelligence Platform) AI Assistant. "
        "Your task is to answer the user's question accurately using ONLY the provided context.\n"
        "Strictly adhere to the following rules:\n"
        "1. Base your answer solely on the provided context sources. Do not extrapolate, infer unmentioned details, or generate unverified facts.\n"
        "2. If the provided context does not contain sufficient information to answer the question, state: "
        "'I cannot find the answer in the ingested documents. Please upload the relevant files to the knowledge repository.'\n"
        "3. Keep your response clear, professional, concise, and objective.\n"
        "4. Never mention 'Finance Reconciliation Engine', 'Account Auto-Reconciliation Billing', "
        "or similar billing phrases unless they are directly present in the provided context above."
    )

    ollama_messages = [
        {"role": "system", "content": system_prompt}
    ]
    
    history = request.messages[-5:-1] if len(request.messages) > 1 else []
    for msg in history:
        ollama_messages.append({"role": msg.role, "content": msg.content})

    enriched_query = f"Context:\n{context_str}\n\nQuestion: {user_query}"
    ollama_messages.append({"role": "user", "content": enriched_query})

    response_text = ""
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            ollama_response = await client.post(
                f"{settings.OLLAMA_URL}/api/chat",
                json={
                    "model": "qwen2:0.5b",
                    "messages": ollama_messages,
                    "stream": False
                }
            )
            if ollama_response.status_code == 200:
                response_text = ollama_response.json().get("message", {}).get("content", "")
            else:
                response_text = (
                    f"Error communicating with local LLM. Status code: {ollama_response.status_code}. "
                    "Make sure Ollama is running and has the model pulled."
                )
    except httpx.ConnectError:
        response_text = (
            "Unable to connect to local Ollama server. Please verify Ollama is active on the network "
            "and running locally in the docker network."
        )
    except Exception as e:
        response_text = f"An unexpected error occurred while communicating with the AI Engine: {str(e)}"

    latency = int((time.time() - start_time) * 1000)

    relevance_sc = min(1.0, 0.70 + 0.05 * len(retrieved_chunks))
    faithfulness_sc = 0.95 if "cannot find the answer" not in response_text.lower() else 1.0

    # 7. Write to Search Audit Logs table
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
