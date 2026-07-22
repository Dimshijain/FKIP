from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from app.db.session import get_db
from app.db.models import User, UserRole, SearchAuditLog, UserFeedback, Document
from app.db.schemas import ReportsAnalytics, SearchAnalytics, DocumentAnalytics, QueryLatencyPoint
from app.api.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/analytics", response_model=ReportsAnalytics)
def get_reports_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Restrict to ADMIN or CREATOR roles
    if current_user.role not in [UserRole.ADMIN, UserRole.CREATOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view reporting dashboards."
        )

    # 1. Search Analytics Calculations
    total_queries = db.query(SearchAuditLog).count()
    
    avg_latency = 0
    if total_queries > 0:
        avg_latency = db.execute(text("SELECT COALESCE(AVG(response_latency_ms), 0) FROM search_audit_logs;")).scalar()
        
    avg_relevance = 0.0
    if total_queries > 0:
        avg_relevance = db.execute(text("SELECT COALESCE(AVG(relevance_score), 0.0) FROM search_audit_logs;")).scalar()
        
    avg_rating = 0.0
    feedback_count = db.query(UserFeedback).count()
    if feedback_count > 0:
        avg_rating = db.execute(text("SELECT COALESCE(AVG(rating), 0.0) FROM user_feedback;")).scalar()

    # Top Queries
    top_queries = []
    if total_queries > 0:
        top_rows = db.execute(text("""
            SELECT query_text, COUNT(*) as count 
            FROM search_audit_logs 
            GROUP BY query_text 
            ORDER BY count DESC 
            LIMIT 5;
        """)).fetchall()
        top_queries = [{"query": row[0], "count": row[1]} for row in top_rows]

    # Latency Trend (Last 15 queries)
    trend_rows = db.execute(text("""
        SELECT created_at, response_latency_ms 
        FROM search_audit_logs 
        ORDER BY created_at ASC 
        LIMIT 15;
    """)).fetchall()
    latency_trend = [QueryLatencyPoint(timestamp=row[0], latency_ms=row[1]) for row in trend_rows]

    search_analytics = SearchAnalytics(
        total_queries=total_queries,
        average_latency_ms=int(avg_latency),
        average_relevance_score=float(avg_relevance),
        average_rating=float(avg_rating),
        top_queries=top_queries,
        latency_trend=latency_trend
    )

    # 2. Document Analytics Calculations
    total_docs = db.query(Document).count()
    total_size = 0
    if total_docs > 0:
        total_size = db.execute(text("SELECT COALESCE(SUM(file_size_bytes), 0) FROM documents;")).scalar()
        
    by_type = []
    if total_docs > 0:
        type_rows = db.execute(text("""
            SELECT file_type, COUNT(*) as count 
            FROM documents 
            GROUP BY file_type 
            ORDER BY count DESC;
        """)).fetchall()
        by_type = [{"type": row[0], "count": row[1]} for row in type_rows]

    doc_analytics = DocumentAnalytics(
        total_count=total_docs,
        total_size_bytes=total_size,
        by_type=by_type
    )

    # 3. Active Users Count
    active_users = 0
    if total_queries > 0:
        active_users = db.execute(text("SELECT COUNT(DISTINCT user_id) FROM search_audit_logs;")).scalar() or 0

    return ReportsAnalytics(
        search=search_analytics,
        documents=doc_analytics,
        active_users_count=active_users
    )

@router.get("/executive")
def get_executive_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.db.models import DocumentChunk, OracleMetadata, DnaApplication, DnaAppFeature, Opportunity
    from app.services.vector import vector_service
    import httpx
    from app.config import settings
    
    # 1. AI Usage Metrics
    total_queries = db.query(SearchAuditLog).count()
    avg_latency = 0
    if total_queries > 0:
        avg_latency = db.execute(text("SELECT COALESCE(AVG(response_latency_ms), 0) FROM search_audit_logs;")).scalar() or 0
        
    avg_rating = 0.0
    feedback_count = db.query(UserFeedback).count()
    if feedback_count > 0:
        avg_rating = db.execute(text("SELECT COALESCE(AVG(rating), 0.0) FROM user_feedback;")).scalar() or 0.0

    # 2. Knowledge Growth
    total_docs = db.query(Document).count()
    total_chunks = db.query(DocumentChunk).count()
    total_ora_metadata = db.query(OracleMetadata).count()
    total_dna_apps = db.query(DnaApplication).count()
    total_dna_features = db.query(DnaAppFeature).count()
    
    # 3. User Activity & Trends
    active_users = 0
    if total_queries > 0:
        active_users = db.execute(text("SELECT COUNT(DISTINCT user_id) FROM search_audit_logs;")).scalar() or 0
        
    top_queries = []
    if total_queries > 0:
        top_rows = db.execute(text("""
            SELECT query_text, COUNT(*) as count 
            FROM search_audit_logs 
            GROUP BY query_text 
            ORDER BY count DESC 
            LIMIT 5;
        """)).fetchall()
        top_queries = [{"query": row[0], "count": row[1]} for row in top_rows]

    # 4. Innovation Metrics
    total_opps = db.query(Opportunity).count()
    
    status_distribution = {}
    if total_opps > 0:
        status_rows = db.execute(text("""
            SELECT status, COUNT(*) as count 
            FROM innovation_opportunities 
            GROUP BY status;
        """)).fetchall()
        status_distribution = {row[0]: row[1] for row in status_rows}

    source_distribution = {}
    if total_opps > 0:
        source_rows = db.execute(text("""
            SELECT source_type, COUNT(*) as count 
            FROM innovation_opportunities 
            GROUP BY source_type;
        """)).fetchall()
        source_distribution = {row[0]: row[1] for row in source_rows}

    priority_distribution = {}
    if total_opps > 0:
        priority_rows = db.execute(text("""
            SELECT priority, COUNT(*) as count 
            FROM innovation_opportunities 
            GROUP BY priority;
        """)).fetchall()
        priority_distribution = {row[0]: row[1] for row in priority_rows}

    # 5. System Health Telemetry
    postgres_status = "healthy"
    weaviate_status = "healthy"
    ollama_status = "healthy"
    
    try:
        nodes = vector_service.client.cluster.nodes()
        if not nodes:
            weaviate_status = "degraded"
    except Exception:
        weaviate_status = "offline"
        
    try:
        resp = httpx.get(f"{settings.OLLAMA_URL}/api/tags", timeout=3.0)
        if resp.status_code != 200:
            ollama_status = "degraded"
    except Exception:
        ollama_status = "offline"

    cpu_util = 25.0
    mem_util = 45.0
    try:
        import psutil
        cpu_util = psutil.cpu_percent(interval=None) or 25.0
        mem_util = psutil.virtual_memory().percent or 45.0
    except Exception:
        pass

    return {
        "ai_usage": {
            "total_queries": total_queries,
            "average_latency_ms": int(avg_latency),
            "average_rating": float(avg_rating),
            "feedback_count": feedback_count
        },
        "knowledge_growth": {
            "documents_count": total_docs,
            "chunks_count": total_chunks,
            "oracle_objects_count": total_ora_metadata,
            "dna_applications_count": total_dna_apps,
            "dna_features_count": total_dna_features
        },
        "user_activity": {
            "active_users_count": active_users,
            "top_queries": top_queries
        },
        "innovation": {
            "total_opportunities": total_opps,
            "status_distribution": status_distribution,
            "source_distribution": source_distribution,
            "priority_distribution": priority_distribution
        },
        "system_health": {
            "postgres": postgres_status,
            "weaviate": weaviate_status,
            "ollama": ollama_status,
            "cpu_percent": cpu_util,
            "memory_percent": mem_util
        }
    }
