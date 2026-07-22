import os
import sys
import json
import glob
import logging
import hashlib
from datetime import datetime, timedelta
from sqlalchemy import text

sys.path.insert(0, "/app")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.db.session import SessionLocal, engine, Base
from app.db.models import (
    User, UserRole, Document, DocumentChunk, IngestionStatus, SearchAuditLog,
    Opportunity, OpportunityPriority, OpportunityStatus, OpportunitySource, OpportunityMetric,
    CopilotConversation, CopilotMessage
)
from app.services.vector import vector_service
from app.services.ingestion import process_document
from app.services.oracle_parser import parse_ddl
from app.services.dna_clustering import ingest_dna_catalog
from app.api.auth import get_password_hash

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] FKIP-DemoSeeder: %(message)s")
logger = logging.getLogger(__name__)

def populate_master_demo_data():
    logger.info("==========================================================")
    logger.info("STARTING MASTER ENTERPRISE DEMO DATA POPULATION")
    logger.info("==========================================================")
    
    db = SessionLocal()

    # 1. Truncate all database tables
    logger.info("Step 1: Cleaning relational database tables...")
    tables_to_truncate = [
        "user_feedback", "search_audit_logs", "document_chunks", "documents",
        "oracle_dependencies", "oracle_metadata", "dna_app_features", "dna_applications",
        "innovation_opportunities", "copilot_messages", "copilot_conversations"
    ]
    for tbl in tables_to_truncate:
        try:
            db.execute(text(f"TRUNCATE TABLE {tbl} RESTART IDENTITY CASCADE;"))
            db.commit()
        except Exception as e:
            db.rollback()

    # 2. Reset Weaviate collections
    logger.info("Step 2: Resetting Weaviate vector collections...")
    try:
        client = vector_service.client
        collections = client.collections.list_all()
        for col in ["DocumentChunk", "DnaAppFeature"]:
            if col in collections:
                client.collections.delete(col)
        vector_service.init_schema()
        logger.info("Weaviate vector collections initialized cleanly.")
    except Exception as e:
        logger.error(f"Weaviate collection reset error: {e}")

    # 3. Seed Default Enterprise Users
    logger.info("Step 3: Creating sample users for Admin, Creator, and Consumer roles...")
    users_data = [
        ("admin@finxsystems.com", "password123", UserRole.ADMIN, "System Administrator"),
        ("creator@finxsystems.com", "password123", UserRole.CREATOR, "Knowledge Creator"),
        ("consumer@finxsystems.com", "password123", UserRole.CONSUMER, "Knowledge Consumer")
    ]
    for email, pwd, role, name in users_data:
        existing = db.query(User).filter(User.email == email).first()
        if not existing:
            u = User(
                email=email,
                password_hash=get_password_hash(pwd),
                role=role,
                is_active=True
            )
            db.add(u)
    db.commit()

    admin_user = db.query(User).filter(User.email == "admin@finxsystems.com").first()

    # 4. Ingest 12 Core Banking Sample Documents
    logger.info("Step 4: Ingesting 12 Core Banking domain specification documents...")
    demo_dir = "/demo_data"
    if not os.path.exists(demo_dir):
        demo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../demo_data"))

    doc_files = glob.glob(os.path.join(demo_dir, "*.txt"))
    logger.info(f"Found {len(doc_files)} specification documents in {demo_dir}.")

    for file_path in sorted(doc_files):
        filename = os.path.basename(file_path)
        with open(file_path, "rb") as f:
            content_bytes = f.read()
        file_hash = hashlib.sha256(content_bytes).hexdigest()

        doc = Document(
            filename=filename,
            file_path=file_path,
            file_type="txt",
            file_size_bytes=len(content_bytes),
            file_hash=file_hash,
            author="FinXSystems Architecture Board (Sample Data)",
            status=IngestionStatus.PENDING
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        process_document(doc.id, db)
        logger.info(f"Ingested & Vectorized [{filename}] (ID: {doc.id})")

    # 5. Parse Oracle DDL Schema
    logger.info("Step 5: Parsing Oracle DDL schema (banking_schema.sql)...")
    sql_path = os.path.join(demo_dir, "banking_schema.sql")
    if not os.path.exists(sql_path):
        sql_path = os.path.join(demo_dir, "hr_schema.sql")

    if os.path.exists(sql_path):
        with open(sql_path, "r", encoding="utf-8") as f:
            sql_content = f.read()
        res = parse_ddl(sql_content, db)
        logger.info(f"Parsed Oracle DDL. Created objects & dependencies: {res}")

    # 6. Ingest Core Banking Application Catalog
    logger.info("Step 6: Ingesting Core Banking application catalog...")
    cat_path = os.path.join(demo_dir, "core_banking_catalog.json")
    if os.path.exists(cat_path):
        with open(cat_path, "r", encoding="utf-8") as f:
            cat_data = json.load(f)
        count = ingest_dna_catalog(cat_data, db)
        logger.info(f"Core Banking catalog ingested. Features indexed: {count}")

    # 7. Seed Sample Innovation Opportunities
    logger.info("Step 7: Seeding sample Innovation Opportunities...")
    opps_seed = [
        ("OPP-001", "Automated ISO20022 Clearing Validation", "Implement automated XML schema validation for high-value Fedwire clearing messages.", OpportunityPriority.P1, OpportunityStatus.IN_PROGRESS, OpportunitySource.DNA_APPLICATIONS, OpportunityMetric.HIGH, OpportunityMetric.MEDIUM),
        ("OPP-002", "Core Banking Ledger Vector Clustering", "Detect redundant billing validation logic across Customer Accounts and Finance engines.", OpportunityPriority.P1, OpportunityStatus.VALIDATING, OpportunitySource.DNA_APPLICATIONS, OpportunityMetric.HIGH, OpportunityMetric.LOW),
        ("OPP-003", "Real-Time Fraud Anomaly Alerting", "Push instant push notifications to mobile banking clients upon impossible travel detection.", OpportunityPriority.P2, OpportunityStatus.IN_PROGRESS, OpportunitySource.GENERAL, OpportunityMetric.MEDIUM, OpportunityMetric.MEDIUM),
        ("OPP-004", "Automated Loan Underwriting Pipeline", "Integrate automated DTI credit scoring with e-signature contract disbursement.", OpportunityPriority.P2, OpportunityStatus.BACKLOG, OpportunitySource.DNA_APPLICATIONS, OpportunityMetric.HIGH, OpportunityMetric.HIGH),
        ("OPP-005", "Basel III Capital Ratio Telemetry", "Real-time CET1 ratio calculations against market yield curve shocks.", OpportunityPriority.P3, OpportunityStatus.COMPLETED, OpportunitySource.ORACLE_METADATA, OpportunityMetric.LOW, OpportunityMetric.LOW)
    ]
    for code, name, desc, pri, stat, src, bval, comp in opps_seed:
        o = Opportunity(
            opp_code=code,
            name=name,
            description=desc,
            priority=pri,
            status=stat,
            source_type=src,
            business_value=bval,
            complexity=comp,
            created_by=admin_user.id
        )
        db.add(o)
    db.commit()
    logger.info("Innovation Opportunities seeded.")

    # 8. Seed AI Copilot Conversation History
    logger.info("Step 8: Seeding AI Copilot conversation history...")
    conv = CopilotConversation(
        user_id=admin_user.id,
        title="Core Banking Architecture Review (Sample Thread)"
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    msg1 = CopilotMessage(
        conversation_id=conv.id,
        role="user",
        content="What is the security authentication model used in the FKIP platform?"
    )
    msg2 = CopilotMessage(
        conversation_id=conv.id,
        role="assistant",
        content="FKIP uses OAuth2 Bearer tokens signed with 256-bit JWT HS256 encryption. Role-Based Access Control (RBAC) enforces strict authorization across ADMIN, CREATOR, and CONSUMER roles."
    )
    db.add(msg1)
    db.add(msg2)
    db.commit()
    logger.info("AI Copilot conversation history seeded.")

    # 9. Seed Search Telemetry & Activity Logs with Realistic Timestamps
    logger.info("Step 9: Seeding search audit logs with realistic timestamps...")
    now = datetime.utcnow()
    logs_seed = [
        ("What port does Weaviate run on in FKIP?", "Weaviate vector database runs on Port 8081.", 210, 0.985, 1.0, False, now - timedelta(days=2)),
        ("How does Oracle Intelligence trace downstream impacts?", "Oracle Intelligence parses SQL DDL statements to build an acyclic dependency graph connecting tables, views, and triggers.", 280, 0.965, 1.0, False, now - timedelta(days=1, hours=5)),
        ("What strategy does FKIP use for document text chunking?", "Text is cleaned and segmented into 800-character chunks with a 100-character sliding overlap.", 195, 0.990, 1.0, False, now - timedelta(hours=8)),
        ("Which database tables handle system authentication?", "Authentication is managed by the users table with bcrypt password hashing.", 165, 0.975, 1.0, False, now - timedelta(hours=2))
    ]
    for q, r, lat, rel, faith, hall, ts in logs_seed:
        log = SearchAuditLog(
            user_id=admin_user.id,
            query_text=q,
            response_text=r,
            response_latency_ms=lat,
            relevance_score=rel,
            faithfulness_score=faith,
            hallucination_detected=hall,
            created_at=ts
        )
        db.add(log)
    db.commit()
    logger.info("Search audit logs seeded.")

    db.close()
    logger.info("==========================================================")
    logger.info("MASTER DEMO DATA POPULATION COMPLETED SUCCESSFULLY")
    logger.info("==========================================================")

if __name__ == "__main__":
    populate_master_demo_data()
