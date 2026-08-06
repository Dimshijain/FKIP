import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.auth import router as auth_router
from app.api.search import router as search_router
from app.api.oracle import router as oracle_router
from app.api.dna import router as dna_router
from app.api.admin import router as admin_router
from app.api.reports import router as reports_router
from app.api.copilot import router as copilot_router
from app.api.innovation import router as innovation_router
from app.api.knowledge_graph import router as knowledge_graph_router
from app.api.docs import router as docs_router
from app.api.sql_writer import router as sql_writer_router
from app.db.session import engine, Base, SessionLocal
from app.db.models import (
    User, UserRole, 
    OracleMetadata, OracleObjectType, OracleDependency, DependencyType, 
    DnaApplication, DnaAppFeature, 
    Opportunity, OpportunitySource, OpportunityMetric, OpportunityPriority, OpportunityStatus, 
    Document, DocumentChunk, IngestionStatus, 
    GeneratedDocument, SearchAuditLog
)
from app.api.auth import get_password_hash
from app.config import settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI application
app = FastAPI(
    title="FKIP Core API",
    description="FinXSystems Knowledge Intelligence Platform Backend API",
    version="1.0.0"
)

# Enable CORS for local SPA client requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend service URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(oracle_router, prefix="/api")
app.include_router(dna_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(copilot_router, prefix="/api")
app.include_router(innovation_router, prefix="/api")
app.include_router(knowledge_graph_router, prefix="/api")
app.include_router(docs_router, prefix="/api")
app.include_router(sql_writer_router, prefix="/api")

@app.on_event("startup")
def startup_event():
    logger.info("Initializing FKIP relational database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Seed Users if empty
        if not db.query(User).first():
            logger.info("Seeding default platform user accounts...")
            admin_user = User(email="admin@finxsystems.com", password_hash=get_password_hash("password123"), role=UserRole.ADMIN)
            creator_user = User(email="creator@finxsystems.com", password_hash=get_password_hash("password123"), role=UserRole.CREATOR)
            consumer_user = User(email="user@finxsystems.com", password_hash=get_password_hash("password123"), role=UserRole.CONSUMER)
            db.add_all([admin_user, creator_user, consumer_user])
            db.commit()

        admin_user = db.query(User).filter(User.email == "admin@finxsystems.com").first()
        creator_user = db.query(User).filter(User.email == "creator@finxsystems.com").first() or admin_user

        # 2. Seed Oracle Metadata & Dependencies if empty
        if not db.query(OracleMetadata).first():
            logger.info("Seeding Oracle Intelligence schema objects...")
            dept_obj = OracleMetadata(
                object_name="DEPARTMENTS",
                object_type=OracleObjectType.TABLE,
                owner="HR",
                schema_definition="CREATE TABLE DEPARTMENTS (\n  DEPARTMENT_ID NUMBER(4) PRIMARY KEY,\n  DEPARTMENT_NAME VARCHAR2(30) NOT NULL,\n  MANAGER_ID NUMBER(6),\n  LOCATION_ID NUMBER(4)\n);"
            )
            emp_obj = OracleMetadata(
                object_name="EMPLOYEES",
                object_type=OracleObjectType.TABLE,
                owner="HR",
                schema_definition="CREATE TABLE EMPLOYEES (\n  EMPLOYEE_ID NUMBER(6) PRIMARY KEY,\n  FIRST_NAME VARCHAR2(20),\n  LAST_NAME VARCHAR2(25) NOT NULL,\n  EMAIL VARCHAR2(25) NOT NULL UNIQUE,\n  HIRE_DATE DATE NOT NULL,\n  JOB_ID VARCHAR2(10) NOT NULL,\n  SALARY NUMBER(8,2),\n  DEPARTMENT_ID NUMBER(4) REFERENCES DEPARTMENTS(DEPARTMENT_ID)\n);"
            )
            view_obj = OracleMetadata(
                object_name="EMP_DETAILS",
                object_type=OracleObjectType.VIEW,
                owner="HR",
                schema_definition="CREATE VIEW EMP_DETAILS AS\nSELECT e.EMPLOYEE_ID, e.FIRST_NAME || ' ' || e.LAST_NAME AS FULL_NAME, e.SALARY, d.DEPARTMENT_NAME\nFROM EMPLOYEES e JOIN DEPARTMENTS d ON e.DEPARTMENT_ID = d.DEPARTMENT_ID;"
            )
            trig_obj = OracleMetadata(
                object_name="LOG_EMPLOYEE_CHANGES",
                object_type=OracleObjectType.TRIGGER,
                owner="HR",
                schema_definition="CREATE OR REPLACE TRIGGER LOG_EMPLOYEE_CHANGES\nAFTER UPDATE ON EMPLOYEES\nFOR EACH ROW\nBEGIN\n  INSERT INTO AUDIT_LOG(EMP_ID, CHANGE_DATE) VALUES (:NEW.EMPLOYEE_ID, SYSDATE);\nEND;"
            )
            db.add_all([dept_obj, emp_obj, view_obj, trig_obj])
            db.commit()

            dep1 = OracleDependency(source_object_id=emp_obj.id, target_object_id=dept_obj.id, dep_type=DependencyType.FOREIGN_KEY)
            dep2 = OracleDependency(source_object_id=view_obj.id, target_object_id=emp_obj.id, dep_type=DependencyType.VIEW_REFERENCE)
            dep3 = OracleDependency(source_object_id=trig_obj.id, target_object_id=emp_obj.id, dep_type=DependencyType.TRIGGER_REFERENCE)
            db.add_all([dep1, dep2, dep3])
            db.commit()

        # 3. Seed DNA Core Banking Applications & Features if empty
        if not db.query(DnaApplication).first():
            logger.info("Seeding Core Banking DNA Applications...")
            app1 = DnaApplication(
                app_code="FAS-CORE",
                app_name="Core Banking Ledger Engine",
                owner="Core Systems Team",
                description="High-volume double-entry transaction posting, account balance tracking, and audit ledger.",
                version="v4.2.0",
                status="ACTIVE",
                platform="Java / Oracle PL/SQL"
            )
            app2 = DnaApplication(
                app_code="FAS-TX",
                app_name="Transaction Gateway",
                owner="Payments Engineering",
                description="Real-time ISO 20022 and SWIFT payment routing, sanction screening, and fee calculation.",
                version="v3.1.0",
                status="ACTIVE",
                platform="Go / Redis"
            )
            db.add_all([app1, app2])
            db.commit()

            feat1 = DnaAppFeature(app_id=app1.id, feature_name="Real-Time Balance Check", feature_description="Instant balance lookup with overdraft validation.", category="ACCOUNT_MANAGEMENT")
            feat2 = DnaAppFeature(app_id=app1.id, feature_name="Double-Entry Posting", feature_description="ACID compliant ledger journal posting.", category="LEDGER")
            feat3 = DnaAppFeature(app_id=app2.id, feature_name="ISO 20022 Payment Parser", feature_description="XML pacs.008 message validation and transformation.", category="PAYMENTS")
            feat4 = DnaAppFeature(app_id=app2.id, feature_name="Sanction List Screening", feature_description="OFAC fuzzy matching on inbound transfers.", category="COMPLIANCE")
            db.add_all([feat1, feat2, feat3, feat4])
            db.commit()

        # 4. Seed Opportunities if empty
        if not db.query(Opportunity).first() and creator_user:
            logger.info("Seeding Innovation Opportunities...")
            opp1 = Opportunity(
                opp_code="OPP-101",
                name="Automate ISO20022 Payment Message Parsing",
                description="Standardize inbound payment gateway to support pacs.008 XML format directly into ledger pipeline.",
                source_type=OpportunitySource.DNA_APPLICATIONS,
                business_value=OpportunityMetric.HIGH,
                complexity=OpportunityMetric.MEDIUM,
                priority=OpportunityPriority.P1,
                status=OpportunityStatus.IN_PROGRESS,
                created_by=creator_user.id
            )
            opp2 = Opportunity(
                opp_code="OPP-102",
                name="Optimize High-Volume Ledger Reconciliation Engine",
                description="Introduce Redis caching layer to accelerate nightly balance reconciliation from 45m to 2m.",
                source_type=OpportunitySource.ORACLE_METADATA,
                business_value=OpportunityMetric.HIGH,
                complexity=OpportunityMetric.HIGH,
                priority=OpportunityPriority.P1,
                status=OpportunityStatus.BACKLOG,
                created_by=admin_user.id
            )
            opp3 = Opportunity(
                opp_code="OPP-103",
                name="Real-Time Fraud Detection Webhook Integration",
                description="Stream transaction events via SSE to real-time risk evaluation engine.",
                source_type=OpportunitySource.GENERAL,
                business_value=OpportunityMetric.MEDIUM,
                complexity=OpportunityMetric.LOW,
                priority=OpportunityPriority.P2,
                status=OpportunityStatus.VALIDATING,
                created_by=creator_user.id
            )
            db.add_all([opp1, opp2, opp3])
            db.commit()

        # 5. Seed Documents if empty
        if not db.query(Document).first():
            logger.info("Seeding Documents and Text Chunks...")
            doc1 = Document(
                filename="core_banking_architecture_spec.txt",
                file_path="/app/uploads/core_banking_architecture_spec.txt",
                file_size_bytes=2450,
                file_type="txt",
                file_hash="hash_core_banking_spec_001",
                author="FinXSystems Enterprise Architecture",
                status=IngestionStatus.COMPLETED
            )
            db.add(doc1)
            db.commit()

            chunk1 = DocumentChunk(
                document_id=doc1.id,
                chunk_index=0,
                chunk_content="FinXSystems Core Banking Architecture Overview: The core ledger engine handles double-entry transaction posting, account balance calculations, and multi-currency operations.",
                token_count=32
            )
            chunk2 = DocumentChunk(
                document_id=doc1.id,
                chunk_index=1,
                chunk_content="ISO 20022 Integration: Inbound payments are parsed via pacs.008 XML format, checked against sanction screening databases, and posted to account balances.",
                token_count=28
            )
            db.add_all([chunk1, chunk2])
            db.commit()

        # 6. Seed Generated Document if empty
        if not db.query(GeneratedDocument).first():
            logger.info("Seeding Generated Specifications...")
            gen_doc = GeneratedDocument(
                doc_type="SRS",
                title="FinXSystems Platform Software Requirements Specification",
                content="# FinXSystems Platform SRS\n\n## 1. System Overview\nFKIP provides AI-powered intelligence across Oracle databases and Core Banking systems.\n\n## 2. Architecture\nBuilt on FastAPI, React, Weaviate Vector DB, and Redis caching.",
                author="admin@finxsystems.com"
            )
            db.add(gen_doc)
            db.commit()

        # 7. Seed Search Audit Logs if empty
        if not db.query(SearchAuditLog).first() and admin_user:
            logger.info("Seeding Search Telemetry Logs...")
            log1 = SearchAuditLog(
                user_id=admin_user.id,
                query_text="Can you explain the core banking architecture?",
                response_text="The core banking platform relies on FAS-CORE for double-entry ledger posting and FAS-TX for ISO 20022 payment routing.",
                response_latency_ms=18,
                relevance_score=0.9850,
                faithfulness_score=0.9910,
                hallucination_detected=False
            )
            log2 = SearchAuditLog(
                user_id=creator_user.id,
                query_text="What database tables are used in FKIP?",
                response_text="FKIP uses PostgreSQL tables including users, documents, document_chunks, oracle_metadata, and dna_applications.",
                response_latency_ms=24,
                relevance_score=0.9620,
                faithfulness_score=0.9800,
                hallucination_detected=False
            )
            db.add_all([log1, log2])
            db.commit()

        logger.info("All platform demo data seeded successfully into database!")
    except Exception as e:
        logger.error(f"Error seeding demo data: {e}")
    finally:
        db.close()
    
    logger.info("FKIP Backend API has started up successfully.")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "fkip-backend",
        "config": {
            "weaviate": settings.WEAVIATE_URL,
            "ollama": settings.OLLAMA_URL,
            "llm_model": settings.LLM_MODEL,
            "embeddings_model": settings.EMBEDDINGS_MODEL
        }
    }
