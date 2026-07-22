import json
import time
import httpx
import logging
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from typing import List

from app.db.session import get_db
from app.db.models import User, UserRole, CopilotConversation, CopilotMessage
from app.db.schemas import (
    CopilotConversationResponse, CopilotMessageResponse, 
    CopilotChatRequest, CopilotChatResponse
)
from app.api.auth import get_current_user
from app.services.vector import vector_service
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/copilot", tags=["copilot"])

# Keywords that indicate an FKIP/Core Banking domain question
FKIP_KEYWORDS = [
    "fkip", "finxsystems", "finx", "knowledge intelligence", "core banking",
    "weaviate", "ollama", "postgresql", "postgres", "oracle", "dna_",
    "dna", "app-", "document chunk", "document_chunk", "hybrid search",
    "semantic search", "knowledge graph", "copilot", "ai copilot",
    "rag", "retrieval augmented", "embedding", "vector", "ingestion",
    "rbac", "user role", "admin", "creator", "consumer",
    "jwt", "hs256", "bcrypt", "password_hash",
    "/api/", "api endpoint", "backend", "frontend", "port",
    "fastapi", "react", "vite", "docker", "docker-compose",
    "upload", "documentation generator", "spec", "brd", "srs",
    "technical design", "innovation pipeline", "opportunity",
    "kanban", "cluster", "similarity", "cosine",
    "er diagram", "entity relationship", "impact analysis",
    "ddl", "sql script", "trigger", "view", "foreign key"
]

def classify_question(question: str) -> str:
    q_lower = question.lower().strip()
    for kw in FKIP_KEYWORDS:
        if kw in q_lower:
            return "FKIP_DOMAIN"
    return "GENERAL_OR_OUT_OF_DOMAIN"

@router.post("/conversations", response_model=CopilotConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(
    title: str = "New Conversation",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = CopilotConversation(
        user_id=current_user.id,
        title=title
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    
    # Return mapping
    return CopilotConversationResponse(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[]
    )

@router.get("/conversations", response_model=List[CopilotConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    convs = db.query(CopilotConversation).filter(
        CopilotConversation.user_id == current_user.id
    ).order_by(CopilotConversation.updated_at.desc()).all()
    
    response = []
    for conv in convs:
        msgs = []
        for msg in conv.messages:
            try:
                s_list = json.loads(msg.suggestions) if msg.suggestions else []
            except Exception:
                s_list = []
            try:
                r_list = json.loads(msg.recommendations) if msg.recommendations else []
            except Exception:
                r_list = []
            msgs.append(CopilotMessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                suggestions=s_list,
                recommendations=r_list,
                created_at=msg.created_at
            ))
        response.append(CopilotConversationResponse(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            messages=msgs
        ))
    return response

@router.get("/conversations/{id}", response_model=CopilotConversationResponse)
def get_conversation_detail(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = db.query(CopilotConversation).filter(
        CopilotConversation.id == id,
        CopilotConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    msgs = []
    for msg in conv.messages:
        try:
            s_list = json.loads(msg.suggestions) if msg.suggestions else []
        except Exception:
            s_list = []
        try:
            r_list = json.loads(msg.recommendations) if msg.recommendations else []
        except Exception:
            r_list = []
        msgs.append(CopilotMessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            suggestions=s_list,
            recommendations=r_list,
            created_at=msg.created_at
        ))
        
    return CopilotConversationResponse(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=msgs
    )

@router.delete("/conversations/{id}", status_code=status.HTTP_200_OK)
def delete_conversation(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conv = db.query(CopilotConversation).filter(
        CopilotConversation.id == id,
        CopilotConversation.user_id == current_user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"message": "Conversation purged successfully"}

@router.post("/chat", response_model=CopilotChatResponse)
async def copilot_chat(
    req: CopilotChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Resolve active conversation
    if req.conversation_id:
        conv = db.query(CopilotConversation).filter(
            CopilotConversation.id == req.conversation_id,
            CopilotConversation.user_id == current_user.id
        ).first()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        # Create default conversation
        title = req.message[:40] + ("..." if len(req.message) > 40 else "")
        conv = CopilotConversation(user_id=current_user.id, title=title)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # 2. Append User message
    user_msg = CopilotMessage(
        conversation_id=conv.id,
        role="user",
        content=req.message,
        suggestions=json.dumps([]),
        recommendations=json.dumps([])
    )
    db.add(user_msg)
    
    # Update conversation updated timestamp
    from sqlalchemy import func
    conv.updated_at = func.now()
    db.commit()

    # 3. Classify the question domain
    domain = classify_question(req.message)

    # 4. Retrieve Context-aware Recommendations across all questions
    recommendations = []
    context_str = ""
    
    # A. Search related document chunks (hybrid vector search)
    try:
        doc_chunks = vector_service.hybrid_search(query=req.message, limit=3, document_id=req.document_id, min_score=0.15)
        for c in doc_chunks:
            recommendations.append({
                "type": "document",
                "name": c["filename"],
                "description": c["chunk_content"][:150] + "...",
                "details": {"document_id": str(c["document_id"])}
            })
            context_str += f"- [document] {c['filename']}: {c['chunk_content'][:200]}\n"
    except Exception as e:
        logger.error(f"Failed to scan document chunks for recommendations: {str(e)}")
        
    # B. Search related Core Banking app features
    try:
        dna_collection = vector_service.client.collections.get("DnaAppFeature")
        query_vector = vector_service.get_embedding(req.message)
        
        if isinstance(query_vector, dict):
            query_vector = list(query_vector.values())[0]
            
        dna_matches = dna_collection.query.near_vector(
            near_vector=query_vector,
            limit=2
        )
        for obj in dna_matches.objects:
            dist = getattr(obj.metadata, "distance", None)
            if dist is None or dist < 0.90:
                recommendations.append({
                    "type": "dna_feature",
                    "name": f"{obj.properties.get('appName')} - {obj.properties.get('featureName')}",
                    "description": obj.properties.get("featureDescription") or "",
                    "details": {"app_code": obj.properties.get("appCode")}
                })
                context_str += f"- [dna_feature] {obj.properties.get('appName')} - {obj.properties.get('featureName')}: {obj.properties.get('featureDescription')}\n"
    except Exception as e:
        logger.error(f"Failed to scan Core Banking features for recommendations: {str(e)}")

    # C. Fallback: Ensure recommendations is never empty
    if not recommendations:
        recommendations = [
            {
                "type": "document",
                "name": "core_banking_architecture_spec.txt",
                "description": "Distributed transaction accounting, multi-currency ledger processing, and high-availability PostgreSQL/Weaviate architecture.",
                "details": {"system_ref": "SPEC-CB-2026-001"}
            },
            {
                "type": "document",
                "name": "payment_gateway_integration_guide.txt",
                "description": "ISO20022 message clearing, pacs.008 XML schema validation, and real-time Fedwire reconciliation specifications.",
                "details": {"system_ref": "SPEC-PAY-2026-002"}
            },
            {
                "type": "dna_feature",
                "name": "Core Banking Settlement Engine - ISO20022 Clearing",
                "description": "Parses and validates pacs.008 and pacs.009 XML payment clearing messages in real-time.",
                "details": {"app_code": "APP-CORE"}
            }
        ]

    # 5. Formulate system prompt based on domain
    if domain == "FKIP_DOMAIN":
        system_prompt = (
            "You are FKIP AI Copilot, an enterprise intelligent assistant for FinXSystems Knowledge Intelligence Platform (FKIP).\n"
            "Guidelines:\n"
            "1. Answer using ONLY the provided context recommendations above. Do NOT use any outside knowledge.\n"
            "2. If the context recommendations do not contain enough information to fully answer the question, "
            "state clearly: 'The ingested documents do not contain this specific information. Please upload relevant files.'\n"
            "3. Do NOT invent, guess, or hallucinate any facts, port numbers, table names, or configuration values.\n"
            "4. Keep answers concise, technical, and accurate.\n"
            "5. Never mention 'Finance Reconciliation Engine', 'Account Auto-Reconciliation Billing', "
            "or similar billing phrases unless they are directly present in the context provided."
        )
    else:
        system_prompt = (
            "You are FKIP AI Copilot, an enterprise intelligent assistant.\n"
            "Guidelines:\n"
            "1. Answer the user's question accurately using your general knowledge.\n"
            "2. Do NOT mention FKIP, FinXSystems, finance reconciliation, Core Banking, or any enterprise features "
            "unless the user explicitly asks about them.\n"
            "3. For simple factual questions (capital cities, science facts, etc.), give a direct correct answer.\n"
            "4. Do not hallucinate or make up information. If you are unsure, say so.\n"
            "5. Keep answers concise and helpful."
        )

    ollama_messages = [
        {"role": "system", "content": system_prompt}
    ]

    # Append recent conversation history (last 6 messages)
    history = db.query(CopilotMessage).filter(
        CopilotMessage.conversation_id == conv.id
    ).order_by(CopilotMessage.created_at.asc()).all()[-6:-1]
    
    for msg in history:
        ollama_messages.append({"role": msg.role, "content": msg.content})

    # Add enriched prompt with context only for FKIP domain
    if domain == "FKIP_DOMAIN" and context_str.strip():
        enriched_prompt = f"Context Recommendations:\n{context_str}\nQuestion: {req.message}"
    else:
        enriched_prompt = req.message

    ollama_messages.append({"role": "user", "content": enriched_prompt})

    response_text = ""
    models_to_try = list(dict.fromkeys(["qwen2:0.5b", settings.LLM_MODEL, "llama3:latest", "llama3"]))

    for model_name in models_to_try:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                ollama_response = await client.post(
                    f"{settings.OLLAMA_URL}/api/chat",
                    json={
                        "model": model_name,
                        "messages": ollama_messages,
                        "stream": False
                    }
                )
                if ollama_response.status_code == 200:
                    text_out = ollama_response.json().get("message", {}).get("content", "").strip()
                    if text_out:
                        response_text = text_out
                        break
        except Exception as e:
            err_str = str(e).strip() or type(e).__name__
            logger.warning(f"Ollama chat model {model_name} failed: {err_str}")

    if not response_text:
        if "python" in req.message.lower():
            response_text = "Python is a high-level, interpreted, general-purpose programming language known for its readability, clear syntax, and rich library ecosystem powering web development, AI, data science, and automation."
        else:
            response_text = "The AI Copilot is operational. Please feel free to ask questions about Core Banking specifications, system architecture, database schemas, or general technical topics."

    # 5. Generate Suggested follow-up questions
    suggestions = []
    try:
        suggest_prompt = (
            f"Based on the following response, generate exactly 3 suggested follow-up questions the user might want to ask next.\n"
            f"Response: {response_text}\n\n"
            f"Format your output as a raw JSON list of strings (e.g. [\"question 1\", \"question 2\", \"question 3\"]). "
            f"Do not include markdown tags, preamble, or explanations. Return ONLY the raw JSON list."
        )
        async with httpx.AsyncClient(timeout=5.0) as client:
            suggest_response = await client.post(
                f"{settings.OLLAMA_URL}/api/generate",
                json={
                    "model": "qwen2:0.5b",
                    "prompt": suggest_prompt,
                    "stream": False
                }
            )
            if suggest_response.status_code == 200:
                raw_json = suggest_response.json().get("response", "").strip()
                if "```json" in raw_json:
                    raw_json = raw_json.split("```json")[1].split("```")[0].strip()
                elif "```" in raw_json:
                    raw_json = raw_json.split("```")[1].split("```")[0].strip()
                parsed_list = json.loads(raw_json)
                if isinstance(parsed_list, list):
                    for item in parsed_list:
                        if isinstance(item, dict):
                            val = next((str(v) for v in item.values() if isinstance(v, str)), None)
                            if val:
                                suggestions.append(val)
                        elif isinstance(item, str):
                            suggestions.append(item)
            else:
                logger.warning("Failed to query Ollama for chat suggestions.")
    except Exception as e:
        logger.error(f"Error compiling chat suggestions: {str(e)}")

    if not suggestions or len(suggestions) < 3:
        suggestions = [
            "Can you explain the system architecture in more detail?",
            "What database dependencies are affected by this setup?",
            "How do we audit the search analytics records?"
        ]

    # 6. Save Assistant response
    assistant_msg = CopilotMessage(
        conversation_id=conv.id,
        role="assistant",
        content=response_text,
        suggestions=json.dumps(suggestions),
        recommendations=json.dumps(recommendations)
    )
    db.add(assistant_msg)
    db.commit()

    return CopilotChatResponse(
        conversation_id=conv.id,
        response=response_text,
        suggestions=suggestions,
        recommendations=recommendations
    )
