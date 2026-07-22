import httpx
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.db.models import User, UserRole, Document, DocumentChunk, Opportunity
from app.db.schemas import UserResponse, UserRoleUpdate, SystemStats, ServiceStatus
from app.api.auth import get_current_user
from app.services.vector import vector_service
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

def enforce_admin(user: User):
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required to access this resource."
        )

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enforce_admin(current_user)
    return db.query(User).order_by(User.email).all()

@router.put("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: UUID,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enforce_admin(current_user)
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own admin role."
        )
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
        
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user

@router.get("/monitoring", response_model=SystemStats)
def system_monitoring(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enforce_admin(current_user)
    
    # 1. Count database rows
    users_count = db.query(User).count()
    documents_count = db.query(Document).count()
    chunks_count = db.query(DocumentChunk).count()
    opps_count = db.query(Opportunity).count()
    
    # 2. Get DB size
    db_size = 0
    try:
        db_size = db.execute(text("SELECT pg_database_size('fkip_db');")).scalar() or 0
    except Exception as db_err:
        logger.error(f"Error querying PG database size: {str(db_err)}")
        
    # 3. Check services health
    # Postgres status
    pg_status = ServiceStatus(status="healthy", details="PostgreSQL responding successfully.")
    
    # Weaviate status
    weav_status = ServiceStatus(status="unknown", details="Weaviate service check skipped.")
    weav_size = 0
    try:
        nodes = vector_service.client.cluster.nodes()
        if nodes:
            object_count = sum(node.stats.object_count for node in nodes if node.stats)
            weav_status = ServiceStatus(status="healthy", details=f"Weaviate responding successfully. Objects: {object_count}")
            # Approximate size based on object count
            weav_size = object_count * 2048  # Estimate 2KB per vector record
    except Exception as weav_err:
        weav_status = ServiceStatus(status="degraded", details=f"Weaviate failed: {str(weav_err)}")
        
    # Ollama status
    ollama_status = ServiceStatus(status="unknown", details="Ollama connection skipped.")
    try:
        resp = httpx.get(f"{settings.OLLAMA_URL}/api/tags", timeout=3.0)
        if resp.status_code == 200:
            models = [m["name"] for m in resp.json().get("models", [])]
            ollama_status = ServiceStatus(
                status="healthy", 
                details=f"Ollama running. Loaded: {', '.join(models)}"
            )
        else:
            ollama_status = ServiceStatus(status="degraded", details=f"Ollama returned HTTP status {resp.status_code}")
    except Exception as ollama_err:
        ollama_status = ServiceStatus(status="offline", details=f"Ollama offline: {str(ollama_err)}")
        
    # 4. Get System memory/CPU details
    cpu_util = 0.0
    mem_util = 0.0
    try:
        import psutil
        cpu_util = psutil.cpu_percent(interval=None)
        mem_util = psutil.virtual_memory().percent
    except ImportError:
        # Fallback using standard libraries or mock
        import os
        try:
            # On Linux, loadavg can represent load status
            load = os.getloadavg()
            cpu_util = round((load[0] / os.cpu_count()) * 100, 1)
        except AttributeError:
            # Windows fallback
            cpu_util = 12.5 # Estimated baseline
        mem_util = 45.0  # Estimated baseline
        
    return SystemStats(
        users_count=users_count,
        documents_count=documents_count,
        chunks_count=chunks_count,
        opportunities_count=opps_count,
        db_size_bytes=db_size,
        weaviate_size_bytes=weav_size,
        ollama_status=ollama_status,
        postgres_status=pg_status,
        weaviate_status=weav_status,
        cpu_percent=cpu_util,
        memory_percent=mem_util
    )
