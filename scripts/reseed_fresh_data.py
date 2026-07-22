import os
import sys
import json
import logging
import hashlib
from sqlalchemy import text

sys.path.insert(0, "/app")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.db.session import SessionLocal, engine, Base
from app.db.models import User, UserRole, Document, DocumentChunk, IngestionStatus, SearchAuditLog
from app.services.vector import vector_service
from app.services.ingestion import process_document, compute_file_hash
from app.services.oracle_parser import parse_ddl
from app.services.dna_clustering import ingest_dna_catalog
from app.api.auth import get_password_hash

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] FKIP-Reseed: %(message)s")
logger = logging.getLogger(__name__)

def reseed_fresh_data():
    logger.info("==================================================")
    logger.info("STARTING FRESH DATA REFRESH & DEMO SEEDING")
    logger.info("==================================================")
    
    db = SessionLocal()

    # 1. Truncate all relational tables
    logger.info("Step 1: Truncating database tables...")
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
            logger.warning(f"Could not truncate {tbl}: {e}")

    # 2. Reset Weaviate collections
    logger.info("Step 2: Resetting Weaviate vector collections...")
    try:
        client = vector_service.client
        collections = client.collections.list_all()
        for col in ["DocumentChunk", "DnaAppFeature"]:
            if col in collections:
                client.collections.delete(col)
        vector_service.init_schema()
        logger.info("Weaviate schemas initialized cleanly.")
    except Exception as e:
        logger.error(f"Weaviate schema reset error: {e}")

    # 3. Ensure Default Users
    logger.info("Step 3: Seeding default user accounts...")
    users = [
        ("admin@finxsystems.com", "password123", UserRole.ADMIN, "System Administrator"),
        ("creator@finxsystems.com", "password123", UserRole.CREATOR, "Knowledge Creator"),
        ("consumer@finxsystems.com", "password123", UserRole.CONSUMER, "Knowledge Consumer")
    ]
    for email, pwd, role, name in users:
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
    logger.info("Seeded users verified.")

    admin_user = db.query(User).filter(User.email == "admin@finxsystems.com").first()

    # 4. Ingest Fresh Architecture Spec Document
    logger.info("Step 4: Ingesting system architecture document from demo_data...")
    spec_path = "/demo_data/fkip_system_architecture_spec.txt"
    if not os.path.exists(spec_path):
        spec_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../demo_data/fkip_system_architecture_spec.txt"))
    
    if os.path.exists(spec_path):
        with open(spec_path, "rb") as f:
            file_bytes = f.read()
        file_hash = hashlib.sha256(file_bytes).hexdigest()
        
        doc = Document(
            filename="fkip_system_architecture_spec.txt",
            file_path=spec_path,
            file_type="txt",
            file_size_bytes=len(file_bytes),
            file_hash=file_hash,
            author="FinXSystems Architecture Team",
            status=IngestionStatus.PENDING
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
        process_document(doc.id, db)
        logger.info(f"Ingested system architecture spec doc. ID: {doc.id}")

    # 5. Ingest Fresh Oracle DDL Schema
    logger.info("Step 5: Parsing and indexing fresh Oracle DDL schema from demo_data...")
    sql_path = "/demo_data/hr_schema.sql"
    if not os.path.exists(sql_path):
        sql_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../demo_data/hr_schema.sql"))
    
    if os.path.exists(sql_path):
        with open(sql_path, "r", encoding="utf-8") as f:
            sql_content = f.read()
        res = parse_ddl(sql_content, db)
        logger.info(f"Oracle DDL parsed successfully. Result: {res}")

    # 6. Ingest Fresh Core Banking Application Catalog
    logger.info("Step 6: Ingesting Core Banking application catalog from demo_data...")
    cat_path = "/demo_data/core_banking_catalog.json"
    if not os.path.exists(cat_path):
        cat_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../demo_data/core_banking_catalog.json"))
        
    if os.path.exists(cat_path):
        with open(cat_path, "r", encoding="utf-8") as f:
            cat_data = json.load(f)
        res = ingest_dna_catalog(cat_data, db)
        logger.info(f"Core Banking catalog ingested successfully. Result: {res}")

    # 7. Seed Initial Search Audit Logs for Reports Analytics
    logger.info("Step 7: Seeding initial search audit logs for reports analytics...")
    sample_queries = [
        ("What port does Weaviate run on in FKIP?", "Weaviate vector database runs on Port 8081.", 240, 0.985, 1.0, False),
        ("Which database tables handle system authentication?", "Authentication is handled by the users table with bcrypt hashed passwords.", 180, 0.965, 1.0, False),
        ("What strategy does FKIP use for document text chunking?", "Cleaned text is segmented into 800-character chunks with a 100-character overlap.", 210, 0.990, 1.0, False),
        ("How does Oracle Intelligence trace downstream impacts?", "Oracle Intelligence parses DDL statements to construct an acyclic dependency graph across tables, views, and triggers.", 290, 0.950, 1.0, False)
    ]
    for q, r, lat, rel, faith, hall in sample_queries:
        log = SearchAuditLog(
            user_id=admin_user.id,
            query_text=q,
            response_text=r,
            response_latency_ms=lat,
            relevance_score=rel,
            faithfulness_score=faith,
            hallucination_detected=hall
        )
        db.add(log)
    db.commit()
    logger.info("Seeded initial search audit logs.")

    db.close()
    logger.info("==================================================")
    logger.info("DATA REFRESH & DEMO SEEDING COMPLETED SUCCESSFULLY")
    logger.info("==================================================")

if __name__ == "__main__":
    reseed_fresh_data()
