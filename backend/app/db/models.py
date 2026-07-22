import enum
from sqlalchemy import Column, String, Integer, BigInteger, ForeignKey, Text, Boolean, Numeric, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import sqlalchemy.sql.functions as func
from app.db.session import Base
import uuid

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    CREATOR = "CREATOR"
    CONSUMER = "CONSUMER"

class IngestionStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class OpportunitySource(str, enum.Enum):
    ORACLE_METADATA = "ORACLE_METADATA"
    DNA_APPLICATIONS = "DNA_APPLICATIONS"
    SUPPORT_TICKETS = "SUPPORT_TICKETS"
    RELEASE_NOTES = "RELEASE_NOTES"
    GENERAL = "GENERAL"

class OpportunityMetric(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class OpportunityPriority(str, enum.Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"

class OpportunityStatus(str, enum.Enum):
    BACKLOG = "BACKLOG"
    IN_PROGRESS = "IN_PROGRESS"
    VALIDATING = "VALIDATING"
    COMPLETED = "COMPLETED"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.CONSUMER)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    opportunities = relationship("Opportunity", back_populates="creator")
    logs = relationship("SearchAuditLog", back_populates="user")

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(1024), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    file_type = Column(String(10), nullable=False)
    file_hash = Column(String(64), unique=True, nullable=False, index=True)
    author = Column(String(255), nullable=True)
    status = Column(SQLEnum(IngestionStatus), nullable=False, default=IngestionStatus.PENDING)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    chunk_content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    document = relationship("Document", back_populates="chunks")

class Opportunity(Base):
    __tablename__ = "innovation_opportunities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opp_code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    source_type = Column(SQLEnum(OpportunitySource), nullable=False)
    business_value = Column(SQLEnum(OpportunityMetric), nullable=False)
    complexity = Column(SQLEnum(OpportunityMetric), nullable=False)
    priority = Column(SQLEnum(OpportunityPriority), nullable=False)
    status = Column(SQLEnum(OpportunityStatus), nullable=False, default=OpportunityStatus.BACKLOG)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    creator = relationship("User", back_populates="opportunities")

class SearchAuditLog(Base):
    __tablename__ = "search_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    query_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=False)
    response_latency_ms = Column(Integer, nullable=False)
    relevance_score = Column(Numeric(5, 4), nullable=True)
    faithfulness_score = Column(Numeric(5, 4), nullable=True)
    hallucination_detected = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="logs")
    feedbacks = relationship("UserFeedback", back_populates="log", cascade="all, delete-orphan")

class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    log_id = Column(UUID(as_uuid=True), ForeignKey("search_audit_logs.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    log = relationship("SearchAuditLog", back_populates="feedbacks")

class OracleObjectType(str, enum.Enum):
    TABLE = "TABLE"
    VIEW = "VIEW"
    PROCEDURE = "PROCEDURE"
    TRIGGER = "TRIGGER"
    COLUMN = "COLUMN"

class DependencyType(str, enum.Enum):
    FOREIGN_KEY = "FOREIGN_KEY"
    VIEW_REFERENCE = "VIEW_REFERENCE"
    TRIGGER_REFERENCE = "TRIGGER_REFERENCE"
    CALLS = "CALLS"

class OracleMetadata(Base):
    __tablename__ = "oracle_metadata"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    object_name = Column(String(255), nullable=False)
    object_type = Column(SQLEnum(OracleObjectType), nullable=False)
    owner = Column(String(100), nullable=False)
    schema_definition = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class OracleDependency(Base):
    __tablename__ = "oracle_dependencies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_object_id = Column(UUID(as_uuid=True), ForeignKey("oracle_metadata.id", ondelete="CASCADE"), nullable=False)
    target_object_id = Column(UUID(as_uuid=True), ForeignKey("oracle_metadata.id", ondelete="CASCADE"), nullable=False)
    dep_type = Column(SQLEnum(DependencyType), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class DnaApplication(Base):
    __tablename__ = "dna_applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    app_code = Column(String(50), unique=True, nullable=False, index=True)
    app_name = Column(String(255), nullable=False)
    owner = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    version = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    platform = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    features = relationship("DnaAppFeature", back_populates="application", cascade="all, delete-orphan")

class DnaAppFeature(Base):
    __tablename__ = "dna_app_features"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    app_id = Column(UUID(as_uuid=True), ForeignKey("dna_applications.id", ondelete="CASCADE"), nullable=False)
    feature_name = Column(String(255), nullable=False)
    feature_description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("DnaApplication", back_populates="features")

class CopilotConversation(Base):
    __tablename__ = "copilot_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    messages = relationship("CopilotMessage", back_populates="conversation", order_by="CopilotMessage.created_at.asc()", cascade="all, delete-orphan")

class CopilotMessage(Base):
    __tablename__ = "copilot_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("copilot_conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), nullable=False) # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    suggestions = Column(Text, nullable=True) # JSON list of strings (follow-up questions)
    recommendations = Column(Text, nullable=True) # JSON list of dicts (recommended documents/objects/capabilities)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("CopilotConversation", back_populates="messages")

class GeneratedDocument(Base):
    __tablename__ = "generated_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doc_type = Column(String(50), nullable=False) # "BRD", "SRS", "TECH_DESIGN", "API_DOCS", "RELEASE_NOTES", "USER_MANUAL"
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    author = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
