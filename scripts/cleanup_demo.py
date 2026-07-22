import os
import sys
import shutil
import logging
from sqlalchemy import text

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("FKIP-Demo-Cleanup")

# Setup sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.services.vector import vector_service
from app.config import settings

def execute_cleanup():
    logger.info("=========================================")
    logger.info("STARTING FKIP DEMO ENVIRONMENT CLEANUP")
    logger.info("=========================================")
    
    db = SessionLocal()
    
    # 1. Clear PostgreSQL Tables
    logger.info("Step 1: Truncating database tables in PostgreSQL...")
    try:
        # Truncate tables and cascade to any dependent records (clears documents, chunks, logs, feedback)
        # RESTART IDENTITY resets auto-increments
        db.execute(text("TRUNCATE TABLE user_feedback, search_audit_logs, document_chunks, documents RESTART IDENTITY CASCADE;"))
        db.commit()
        logger.info("PostgreSQL tables user_feedback, search_audit_logs, document_chunks, documents truncated successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to truncate PostgreSQL tables: {str(e)}")
        sys.exit(1)

    # 2. Clear Weaviate Embeddings
    logger.info("Step 2: Clearing Weaviate vector database embeddings...")
    try:
        client = vector_service.client
        collections = client.collections.list_all()
        
        if "DocumentChunk" in collections:
            logger.info("Recreating collection 'DocumentChunk' to clear all vector objects...")
            client.collections.delete("DocumentChunk")
            vector_service.init_schema()
            logger.info("Weaviate DocumentChunk collection dropped and re-initialized.")
        else:
            logger.info("DocumentChunk collection does not exist in Weaviate. Initializing schema...")
            vector_service.init_schema()
    except Exception as e:
        logger.error(f"Failed to clear Weaviate embeddings: {str(e)}")
        sys.exit(1)

    # 3. Clear Ingested Files on Disk
    logger.info("Step 3: Removing uploaded test documents from filesystem...")
    upload_dir = settings.UPLOAD_DIR
    if os.path.exists(upload_dir):
        logger.info(f"Scanning directory: {upload_dir}")
        deleted_files = 0
        for filename in os.listdir(upload_dir):
            file_path = os.path.join(upload_dir, filename)
            # Avoid deleting hidden files like .gitkeep if any exist
            if filename.startswith('.'):
                continue
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                    deleted_files += 1
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
                    deleted_files += 1
            except Exception as e:
                logger.error(f"Failed to delete filesystem item {file_path}: {str(e)}")
                
        logger.info(f"Deleted {deleted_files} document files from {upload_dir}.")
    else:
        logger.info(f"Upload directory {upload_dir} does not exist. No files to delete.")

    # 4. Verification Validation
    logger.info("Step 4: Performing verification validation...")
    validation_status = "PASS"
    verification_details = []
    
    # Validate DB
    try:
        doc_count = db.execute(text("SELECT COUNT(*) FROM documents;")).scalar()
        chunk_count = db.execute(text("SELECT COUNT(*) FROM document_chunks;")).scalar()
        log_count = db.execute(text("SELECT COUNT(*) FROM search_audit_logs;")).scalar()
        
        verification_details.append(f"PostgreSQL documents count: {doc_count} (Expected: 0)")
        verification_details.append(f"PostgreSQL document_chunks count: {chunk_count} (Expected: 0)")
        verification_details.append(f"PostgreSQL search_audit_logs count: {log_count} (Expected: 0)")
        
        if doc_count != 0 or chunk_count != 0 or log_count != 0:
            validation_status = "FAIL"
    except Exception as e:
        validation_status = "FAIL"
        verification_details.append(f"PostgreSQL validation query failed: {str(e)}")
        
    # Validate Weaviate
    try:
        client = vector_service.client
        coll = client.collections.get("DocumentChunk")
        response = coll.query.fetch_objects(limit=1)
        weaviate_count = len(response.objects)
        verification_details.append(f"Weaviate DocumentChunk object count: {weaviate_count} (Expected: 0)")
        if weaviate_count != 0:
            validation_status = "FAIL"
    except Exception as e:
        validation_status = "FAIL"
        verification_details.append(f"Weaviate validation query failed: {str(e)}")
        
    # Validate Disk
    try:
        if os.path.exists(upload_dir):
            remaining_files = [f for f in os.listdir(upload_dir) if not f.startswith('.')]
            verification_details.append(f"Filesystem upload folder item count: {len(remaining_files)} (Expected: 0)")
            if len(remaining_files) != 0:
                validation_status = "FAIL"
        else:
            verification_details.append("Filesystem upload folder: Not present (Expected: 0 files)")
    except Exception as e:
        validation_status = "FAIL"
        verification_details.append(f"Filesystem validation failed: {str(e)}")

    logger.info("=========================================")
    logger.info("DEMO ENVIRONMENT CLEANUP SUMMARY")
    logger.info("=========================================")
    logger.info(f"Validation Status: {validation_status}")
    for detail in verification_details:
        logger.info(f" - {detail}")
    logger.info("=========================================")
    
    db.close()
    sys.exit(0 if validation_status == "PASS" else 1)

if __name__ == "__main__":
    execute_cleanup()
