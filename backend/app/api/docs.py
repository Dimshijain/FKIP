import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.db.session import get_db
from app.db.models import User, UserRole, GeneratedDocument, Document, OracleMetadata, DnaApplication, Opportunity
from app.db.schemas import GeneratedDocumentCreate, GeneratedDocumentResponse
from app.api.auth import get_current_user
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/docs", tags=["documentation"])

@router.post("/generate", response_model=GeneratedDocumentResponse, status_code=status.HTTP_201_CREATED)
async def generate_document_template(
    req: GeneratedDocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.CREATOR]:
        raise HTTPException(status_code=403, detail="Viewer roles are restricted from generating specifications.")

    # 1. Compile System Metadata Context to make document context-aware
    context_str = ""
    
    # A. Add database objects overview
    oracle_objs = db.query(OracleMetadata).all()
    if oracle_objs:
        context_str += "Database Tables/Views/Triggers List:\n"
        for obj in oracle_objs:
            context_str += f"- {obj.object_name} ({obj.object_type.value})\n"
        context_str += "\n"
        
    # B. Add applications list
    apps = db.query(DnaApplication).all()
    if apps:
        context_str += "Application specs catalog:\n"
        for app in apps:
            context_str += f"- {app.app_code} {app.app_name} (Platform: {app.platform})\n"
        context_str += "\n"
        
    # C. Add opportunities backlog
    opps = db.query(Opportunity).all()
    if opps:
        context_str += "Prioritized Product Backlog & Enhancements:\n"
        for o in opps:
            context_str += f"- [{o.opp_code}] {o.name}: {o.description} (Priority: {o.priority.value})\n"
        context_str += "\n"

    # 2. Formulate Prompt based on document type
    doc_type_upper = req.doc_type.upper()
    
    prompt_headers = {
        "BRD": "Business Requirement Document (BRD)",
        "SRS": "Software Requirement Specification (SRS)",
        "TECH_DESIGN": "Technical Design Document",
        "API_DOCS": "API Integration Documentation",
        "RELEASE_NOTES": "Product Release Notes",
        "USER_MANUAL": "End-User System Manual"
    }
    
    doc_title = prompt_headers.get(doc_type_upper, "Enterprise Specification Document")

    prompt = (
        f"You are a Principal Enterprise Systems Architect. Draft a highly professional, detailed, and comprehensive "
        f"{doc_title} for the project 'FinXSystems Knowledge Intelligence Platform (FKIP)'.\n"
        f"Incorporate the following system metadata context in your document:\n\n"
        f"Context:\n{context_str}\n\n"
        f"Requirements:\n"
        f"1. Use clear, nested Markdown formatting (# for Title, ## for Sections, ### for Subsections).\n"
        f"2. Keep the style formal, rigorous, and technical.\n"
        f"3. Make sure to define system components, operational goals, architectures, and integration workflows specific to FKIP.\n"
        f"4. Do not include placeholders, brackets, or generic templates. Fill out all sections completely.\n\n"
        f"Begin drafting:"
    )

    content_text = ""
    try:
        async with httpx.AsyncClient(timeout=150.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_URL}/api/generate",
                json={
                    "model": settings.LLM_MODEL,
                    "prompt": prompt,
                    "stream": False
                }
            )
            if response.status_code == 200:
                content_text = response.json().get("response", "").strip()
            else:
                logger.error(f"Failed to call Ollama generator: {response.text}")
                content_text = "Failed to communicate with LLM server."
    except Exception as e:
        logger.error(f"Error calling Ollama doc generator: {str(e)}")
        content_text = f"Documentation auto-generation error: {str(e)}"

    # Default fallback contents in case of LLM failures
    if not content_text or len(content_text) < 100:
        content_text = (
            f"# {doc_title}\n\n"
            f"**Project Name**: FinXSystems Knowledge Intelligence Platform (FKIP)\n"
            f"**Author**: {current_user.email}\n"
            f"**Status**: Draft\n\n"
            f"## 1. Executive Summary\n"
            f"This {doc_title} outlines the operational guidelines, capability integrations, and architectural scopes "
            f"supporting the FKIP platform core intelligence operations.\n\n"
            f"## 2. Platform Scope\n"
            f"The platform integrates PostgreSQL for transaction logs, Weaviate for semantic vector chunk indexes, and Ollama for local LLM calculations.\n"
        )

    # 3. Save generated document in DB
    doc_entry = GeneratedDocument(
        doc_type=req.doc_type,
        title=req.title,
        content=content_text,
        author=current_user.email
    )
    db.add(doc_entry)
    db.commit()
    db.refresh(doc_entry)

    return doc_entry

@router.get("", response_model=List[GeneratedDocumentResponse])
def get_all_generated_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(GeneratedDocument).order_by(GeneratedDocument.created_at.desc()).all()

@router.get("/{id}", response_model=GeneratedDocumentResponse)
def get_generated_document_detail(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(GeneratedDocument).filter(GeneratedDocument.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Generated document not found")
    return doc

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_generated_document(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in [UserRole.ADMIN, UserRole.CREATOR]:
        raise HTTPException(status_code=403, detail="Viewer accounts cannot purge document specifications.")
        
    doc = db.query(GeneratedDocument).filter(GeneratedDocument.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Generated document not found")
    db.delete(doc)
    db.commit()
    return {"message": "Document purged successfully"}
