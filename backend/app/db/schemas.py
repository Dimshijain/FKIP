from pydantic import BaseModel, EmailStr
from typing import Optional, List, Union
from datetime import datetime
from uuid import UUID
from app.db.models import UserRole, IngestionStatus, OpportunitySource, OpportunityMetric, OpportunityPriority, OpportunityStatus

# --- AUTH SCHEMAS ---
class UserBase(BaseModel):
    email: EmailStr
    role: UserRole

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[UserRole] = None

# --- DOCUMENT SCHEMAS ---
class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    file_size_bytes: int
    file_type: str
    status: IngestionStatus
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentChunkResponse(BaseModel):
    id: UUID
    chunk_index: int
    chunk_content: str
    token_count: int

    class Config:
        from_attributes = True

# --- SEARCH & RAG SCHEMAS ---
class SearchQueryRequest(BaseModel):
    query: str
    limit: Optional[int] = 5
    document_id: Optional[str] = None

class SearchResultChunk(BaseModel):
    document_id: str
    filename: str
    chunk_content: str
    score: float

class SearchQueryResponse(BaseModel):
    query: str
    results: List[SearchResultChunk]

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatQueryRequest(BaseModel):
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    document_id: Optional[str] = None

class CitationSource(BaseModel):
    filename: str
    chunk_content: str

class ChatQueryResponse(BaseModel):
    response: str
    citations: List[CitationSource]
    log_id: UUID

# --- FEEDBACK SCHEMAS ---
class FeedbackCreate(BaseModel):
    log_id: UUID
    rating: int # 1 to 5
    comments: Optional[str] = None

# --- OPPORTUNITY SCHEMAS ---
class OpportunityBase(BaseModel):
    name: str
    description: str
    source_type: OpportunitySource
    business_value: OpportunityMetric
    complexity: OpportunityMetric
    priority: OpportunityPriority
    status: OpportunityStatus = OpportunityStatus.BACKLOG

class OpportunityCreate(OpportunityBase):
    pass

class OpportunityResponse(OpportunityBase):
    id: UUID
    opp_code: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- PHASE 2 ADDITIONAL SCHEMAS ---
from app.db.models import OracleObjectType, DependencyType

# --- ORACLE SCHEMAS ---
class OracleMetadataBase(BaseModel):
    object_name: str
    object_type: OracleObjectType
    owner: str
    schema_definition: str

class OracleMetadataCreate(OracleMetadataBase):
    pass

class OracleMetadataResponse(OracleMetadataBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OracleDependencyResponse(BaseModel):
    id: UUID
    source_object_id: UUID
    target_object_id: UUID
    dep_type: DependencyType
    created_at: datetime

    class Config:
        from_attributes = True

class ImpactAnalysisItem(BaseModel):
    id: UUID
    object_name: str
    object_type: str
    dep_type: str
    depth: int
    status: Optional[str] = "VALID_REFERENCE"
    status_label: Optional[str] = "Valid reference"
    risk_level: Optional[str] = "LOW"
    is_broken: Optional[bool] = False


# --- CORE BANKING SCHEMAS ---
class DnaAppFeatureBase(BaseModel):
    feature_name: str
    feature_description: str
    category: str

class DnaAppFeatureResponse(DnaAppFeatureBase):
    id: UUID
    app_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class DnaApplicationBase(BaseModel):
    app_code: str
    app_name: str
    owner: str
    description: str
    version: str
    status: str
    platform: str

class DnaApplicationResponse(DnaApplicationBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    features: List[DnaAppFeatureResponse] = []

    class Config:
        from_attributes = True

class FeatureSimilarityItem(BaseModel):
    app_code: str
    app_name: str
    feature_name: str
    feature_description: str
    similarity_score: float

class CapabilityCluster(BaseModel):
    cluster_id: str
    primary_capability: str
    category: str
    features: List[FeatureSimilarityItem]

# --- ADMIN & MONITORING SCHEMAS ---
class UserRoleUpdate(BaseModel):
    role: UserRole

class ServiceStatus(BaseModel):
    status: str
    details: str

class SystemStats(BaseModel):
    users_count: int
    documents_count: int
    chunks_count: int
    opportunities_count: int
    db_size_bytes: int
    weaviate_size_bytes: int
    ollama_status: ServiceStatus
    postgres_status: ServiceStatus
    weaviate_status: ServiceStatus
    cpu_percent: float
    memory_percent: float

# --- REPORTS SCHEMAS ---
class QueryLatencyPoint(BaseModel):
    timestamp: datetime
    latency_ms: int

class SearchAnalytics(BaseModel):
    total_queries: int
    average_latency_ms: int
    average_relevance_score: float
    average_rating: float
    top_queries: List[dict]
    latency_trend: List[QueryLatencyPoint]

class DocumentAnalytics(BaseModel):
    total_count: int
    total_size_bytes: int
    by_type: List[dict]

class ReportsAnalytics(BaseModel):
    search: SearchAnalytics
    documents: DocumentAnalytics
    active_users_count: int

# --- PHASE 3 INTELLIGENT LAYER SCHEMAS ---

# Copilot Schemas
class CopilotMessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    suggestions: Optional[List[str]] = None
    recommendations: Optional[List[dict]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CopilotConversationResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[CopilotMessageResponse] = []

    class Config:
        from_attributes = True

class CopilotChatRequest(BaseModel):
    conversation_id: Optional[Union[UUID, str]] = None
    message: str
    document_id: Optional[str] = None
    model: Optional[str] = "qwen2:0.5b"

class CopilotChatResponse(BaseModel):
    conversation_id: UUID
    message_id: Optional[UUID] = None
    model: Optional[str] = "qwen2:0.5b"
    response: str
    suggestions: List[str]
    recommendations: List[dict]

# Generated Document Schemas
class GeneratedDocumentCreate(BaseModel):
    doc_type: str # "BRD", "SRS", "TECH_DESIGN", "API_DOCS", "RELEASE_NOTES", "USER_MANUAL"
    title: str

class CustomDocumentCreate(BaseModel):
    doc_type: Optional[str] = "TECH_DESIGN"
    title: str
    content: str

class DocumentUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    append_content: Optional[str] = None

class GeneratedDocumentResponse(BaseModel):
    id: UUID
    doc_type: str
    title: str
    content: str
    author: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Innovation Discovery Engine Schemas
class InnovationAnalyzeRequest(BaseModel):
    document_ids: List[UUID]

class ProposedOpportunity(BaseModel):
    name: str
    description: str
    business_value: OpportunityMetric
    complexity: OpportunityMetric
    priority: OpportunityPriority
    impact_assessment: str

class InnovationAnalyzeResponse(BaseModel):
    gaps: List[str]
    ideas: List[ProposedOpportunity]

# Knowledge Graph Schemas
class GraphNode(BaseModel):
    id: str
    label: str
    type: str # "document", "oracle_object", "dna_application", "opportunity"
    metadata: Optional[dict] = None

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str # "contains", "references", "belongs_to", "depends_on", "source_of"

class KnowledgeGraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

# --- SQL WRITER SCHEMAS ---
class SqlGenerateRequest(BaseModel):
    prompt: str
    dialect: Optional[str] = "ORACLE" # "ORACLE" or "POSTGRESQL"
    table_context: Optional[List[str]] = None

class SqlGenerateResponse(BaseModel):
    id: UUID
    prompt: str
    dialect: str
    generated_sql: str
    explanation: str
    is_safe: bool
    safety_warning: Optional[str] = None
    row_count: Optional[int] = None
    execution_time_ms: Optional[float] = None
    executed_at: Optional[datetime] = None
    execution_status: Optional[str] = "UNEXECUTED"
    created_at: datetime

    class Config:
        from_attributes = True

class SqlExecuteRequest(BaseModel):
    sql: str
    dialect: Optional[str] = "ORACLE"
    prompt: Optional[str] = None
    history_id: Optional[Union[UUID, str]] = None

class SqlExecuteResponse(BaseModel):
    success: bool
    columns: List[str] = []
    rows: List[dict] = []
    row_count: int = 0
    execution_time_ms: float = 0.0
    is_safe: bool = True
    error: Optional[str] = None
    history_id: Optional[UUID] = None
    executed_at: datetime

class SqlDocGenerateRequest(BaseModel):
    sql: str
    dialect: str = "ORACLE"
    prompt: Optional[str] = None
    explanation: Optional[str] = None
    columns: Optional[List[str]] = []
    row_count: Optional[int] = 0
    execution_time_ms: Optional[float] = 0.0
    doc_type: Optional[str] = "TECH_DESIGN"
    sample_rows: Optional[List[dict]] = None

class SqlDocGenerateResponse(BaseModel):
    title: str
    doc_type: str
    content: str
    metadata: dict

class SqlFormatRequest(BaseModel):
    sql: str
    dialect: Optional[str] = "ORACLE"

class SqlFormatResponse(BaseModel):
    formatted_sql: str

class SqlExplainRequest(BaseModel):
    sql: str
    dialect: Optional[str] = "ORACLE"

class SqlExplainResponse(BaseModel):
    explanation: str

class SqlSchemaColumn(BaseModel):
    column_name: str
    data_type: str
    is_nullable: bool = True

class SqlSchemaTable(BaseModel):
    table_name: str
    object_type: str
    owner: str
    columns: List[SqlSchemaColumn] = []

class SqlSchemaTreeResponse(BaseModel):
    tables: List[SqlSchemaTable]


