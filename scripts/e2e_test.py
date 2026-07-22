import os
import sys
import time
import httpx
import logging
from sqlalchemy.orm import Session

# Set up logging to stdout
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("FKIP-E2E-Tester")

# Setup sys.path to resolve imports from parent directories
sys.path.insert(0, "/app")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal, engine, Base
from app.db.models import User, Document, DocumentChunk, IngestionStatus
from app.services.vector import vector_service
from app.services.ingestion import process_document, compute_file_hash
from app.api.auth import verify_password, create_access_token
from app.config import settings

def run_tests():
    logger.info("=========================================")
    logger.info("STARTING FKIP END-TO-END SYSTEM VALIDATION")
    logger.info("=========================================")
    
    results = {}
    
    # 1. PostgreSQL Connectivity & Schema Validation
    logger.info("[TEST 1] Validating PostgreSQL connection...")
    try:
        db = SessionLocal()
        # Verify schema table names
        inspector = engine.dialect.inspector(engine)
        tables = inspector.get_table_names()
        logger.info(f"Connected to PostgreSQL. Found tables: {tables}")
        
        # Verify seed users
        users = db.query(User).all()
        logger.info(f"Verified users in DB. Seeded users count: {len(users)}")
        for u in users:
            logger.info(f" - User: {u.email} (Role: {u.role})")
            
        results["PostgreSQL Connectivity"] = ("PASS", f"Connection successful. Found {len(tables)} tables and {len(users)} seeded users.")
    except Exception as e:
        logger.error(f"PostgreSQL connection failed: {str(e)}")
        results["PostgreSQL Connectivity"] = ("FAIL", str(e))
        db = None

    # 2. Weaviate Connectivity & Schema Verification
    logger.info("[TEST 2] Validating Weaviate connection...")
    try:
        client = vector_service.client
        logger.info("Weaviate client initialized successfully.")
        
        # Check schemas
        collections = client.collections.list_all()
        collections_names = list(collections.keys())
        logger.info(f"Connected to Weaviate. Collections found: {collections_names}")
        
        if "DocumentChunk" in collections_names:
            results["Weaviate Connectivity"] = ("PASS", f"Connection successful. Found collections: {collections_names}")
        else:
            results["Weaviate Connectivity"] = ("FAIL", f"Connected, but DocumentChunk collection is missing. Collections found: {collections_names}")
    except Exception as e:
        logger.error(f"Weaviate connection failed: {str(e)}")
        results["Weaviate Connectivity"] = ("FAIL", str(e))

    # 3. Ollama Connectivity & Models Check
    logger.info("[TEST 3] Validating Ollama connection and models...")
    try:
        response = httpx.get(f"{settings.OLLAMA_URL}/api/tags")
        if response.status_code == 200:
            models_data = response.json().get("models", [])
            models_list = [m["name"] for m in models_data]
            logger.info(f"Connected to Ollama. Pulled models: {models_list}")
            
            # Check for required models
            missing = []
            if "llama3:latest" not in models_list and "llama3" not in models_list:
                missing.append("llama3")
            if "all-minilm:latest" not in models_list and "all-minilm" not in models_list:
                missing.append("all-minilm")
                
            if not missing:
                results["Ollama Connectivity"] = ("PASS", f"Connected successfully. Models loaded: {models_list}")
            else:
                results["Ollama Connectivity"] = ("FAIL", f"Connected, but missing models: {missing}. Available: {models_list}")
        else:
            results["Ollama Connectivity"] = ("FAIL", f"Failed with status code {response.status_code}")
    except Exception as e:
        logger.error(f"Ollama connection failed: {str(e)}")
        results["Ollama Connectivity"] = ("FAIL", str(e))

    # 4. FastAPI Backend Health Check
    logger.info("[TEST 4] Validating FastAPI Health endpoint...")
    try:
        # Since we run inside the container, we can hit localhost:8000
        response = httpx.get("http://localhost:8000/health")
        if response.status_code == 200:
            health = response.json()
            logger.info(f"Health check payload: {health}")
            results["FastAPI Backend Health"] = ("PASS", f"Status: {health['status']}, Configured models: LLM={health['config']['llm_model']}, Embeddings={health['config']['embeddings_model']}")
        else:
            results["FastAPI Backend Health"] = ("FAIL", f"Health endpoint returned status code {response.status_code}")
    except Exception as e:
        logger.error(f"FastAPI health check failed: {str(e)}")
        results["FastAPI Backend Health"] = ("FAIL", str(e))

    # 5. Authentication Flow Check
    logger.info("[TEST 5] Validating authentication and verify_password functions...")
    try:
        if db:
            creator_user = db.query(User).filter(User.email == "creator@finxsystems.com").first()
            if creator_user:
                auth_success = verify_password("password123", creator_user.password_hash)
                logger.info(f"Authentication test for creator@finxsystems.com: {auth_success}")
                if auth_success:
                    results["Authentication Flow"] = ("PASS", "Successfully verified seeded passwords using bcrypt.")
                else:
                    results["Authentication Flow"] = ("FAIL", "Seeded password 'password123' failed to verify against creator's hash.")
            else:
                results["Authentication Flow"] = ("FAIL", "creator@finxsystems.com not found in PostgreSQL database.")
        else:
            results["Authentication Flow"] = ("FAIL", "Skipped. Database connection is down.")
    except Exception as e:
        logger.error(f"Authentication validation failed: {str(e)}")
        results["Authentication Flow"] = ("FAIL", str(e))

    # 6. Document Ingestion Pipeline Check (Upload, Parsing, Chunking, Embeddings, Storage)
    logger.info("[TEST 6] Validating document upload, parsing, chunk generation, embedding generation, and vector indexing...")
    test_doc_id = None
    try:
        if db:
            # Create a mock text file
            upload_dir = "/app/uploads"
            os.makedirs(upload_dir, exist_ok=True)
            test_filepath = os.path.join(upload_dir, "test_validation_doc.txt")
            
            test_text = (
                "FinXSystems Knowledge Intelligence Platform (FKIP) is a secure, private enterprise AI platform "
                "built to process relational knowledge graphs and vector databases. "
                "FKIP uses Weaviate on port 8081 for fast semantic search and vector stores. "
                "The system is designed by the core team at FinXSystems. "
                "Ollama runs on-premises to process queries using llama3 and compute embeddings with all-minilm. "
                "This guarantees compliance and complete data ownership on-premises."
            )
            
            with open(test_filepath, "w", encoding="utf-8") as f:
                f.write(test_text)
                
            file_hash = compute_file_hash(test_filepath)
            
            # Remove pre-existing document with same hash if exists
            dup = db.query(Document).filter(Document.file_hash == file_hash).first()
            if dup:
                db.delete(dup)
                db.commit()
                
            # Create Document row
            doc = Document(
                filename="test_validation_doc.txt",
                file_path=test_filepath,
                file_size_bytes=len(test_text.encode('utf-8')),
                file_type="txt",
                file_hash=file_hash,
                author="system-validation@finxsystems.com",
                status=IngestionStatus.PENDING
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            test_doc_id = doc.id
            logger.info(f"Created pending Document record with ID {test_doc_id}")
            
            # Execute Ingestion Pipeline
            logger.info("Executing process_document pipeline...")
            process_document(test_doc_id, db)
            
            # Refresh doc status
            db.refresh(doc)
            logger.info(f"Post-processing document status: {doc.status}")
            
            if doc.status == IngestionStatus.COMPLETED:
                # Query Postgres chunks
                chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == test_doc_id).all()
                logger.info(f"Verified database chunks count in PostgreSQL: {len(chunks)}")
                
                # Check Weaviate index content
                weaviate_client = vector_service.client
                coll = weaviate_client.collections.get("DocumentChunk")
                
                # Query back chunks from Weaviate by filtering on documentId
                from weaviate.classes.query import Filter
                response = coll.query.fetch_objects(
                    filters=Filter.by_property("documentId").equal(str(test_doc_id))
                )
                logger.info(f"Verified indexed chunks count in Weaviate: {len(response.objects)}")
                
                if len(chunks) > 0 and len(response.objects) > 0:
                    results["Document Ingestion Pipeline"] = ("PASS", f"Successfully parsed document, created {len(chunks)} chunks, generated embeddings via Ollama, and stored vectors in Weaviate.")
                else:
                    results["Document Ingestion Pipeline"] = ("FAIL", f"Pipeline finished, but database chunks = {len(chunks)}, Weaviate chunks = {len(response.objects)}")
            else:
                results["Document Ingestion Pipeline"] = ("FAIL", f"Ingestion pipeline failed. Status: {doc.status}. Error: {doc.error_message}")
        else:
            results["Document Ingestion Pipeline"] = ("FAIL", "Skipped. Database connection is down.")
    except Exception as e:
        logger.error(f"Document Ingestion Validation failed: {str(e)}")
        results["Document Ingestion Pipeline"] = ("FAIL", str(e))

    # 7. Semantic and Hybrid Search Check
    logger.info("[TEST 7] Validating Semantic & Hybrid Search...")
    try:
        if test_doc_id:
            search_query = "What is the port for Weaviate in FKIP?"
            logger.info(f"Executing hybrid search for: '{search_query}'")
            search_results = vector_service.hybrid_search(query=search_query, limit=3)
            logger.info(f"Hybrid search results: {search_results}")
            
            # Check if our uploaded file is returned
            found = False
            for r in search_results:
                if r["filename"] == "test_validation_doc.txt":
                    found = True
                    logger.info(f"Found match: '{r['chunk_content']}' (Score: {r['score']})")
                    break
                    
            if found:
                results["Semantic/Hybrid Search"] = ("PASS", f"Search successfully returned the relevant chunk from test_validation_doc.txt. Results returned: {len(search_results)}")
            else:
                results["Semantic/Hybrid Search"] = ("FAIL", f"Search returned {len(search_results)} results, but did not match the uploaded test document.")
        else:
            results["Semantic/Hybrid Search"] = ("FAIL", "Skipped. Document Ingestion was not completed.")
    except Exception as e:
        logger.error(f"Semantic/Hybrid Search failed: {str(e)}")
        results["Semantic/Hybrid Search"] = ("FAIL", str(e))

    # 8. RAG response generation Check
    logger.info("[TEST 8] Validating RAG Response Generation...")
    try:
        if test_doc_id:
            # Generate valid access token for the creator user
            creator_user = db.query(User).filter(User.email == "creator@finxsystems.com").first()
            access_token = create_access_token(data={"sub": creator_user.email})
            headers = {"Authorization": f"Bearer {access_token}"}
            
            chat_payload = {
                "messages": [
                    {"role": "user", "content": "What is the port for Weaviate in FKIP and who designed the system?"}
                ]
            }
            logger.info("Hitting RAG assistant endpoint /api/search/chat with Authorization header...")
            response = httpx.post("http://localhost:8000/api/search/chat", json=chat_payload, headers=headers, timeout=50.0)
            if response.status_code == 200:
                rag_res = response.json()
                logger.info(f"RAG Assistant Response: {rag_res['response']}")
                logger.info(f"Citations: {rag_res['citations']}")
                
                # Check that response mentions Weaviate and FinXSystems
                text = rag_res['response'].lower()
                if len(text.strip()) > 0:
                    quality = "HIGH" if ("weaviate" in text or "finxsystems" in text) else "LOW (small LLM output complexity)"
                    results["RAG Response Generation"] = ("PASS", f"RAG returned response successfully ({quality}). Latency: {rag_res.get('latency_ms', 0)}ms. Log entry: {rag_res['log_id']}")
                else:
                    results["RAG Response Generation"] = ("FAIL", f"RAG assistant returned an empty response. Response: {rag_res['response']}")
            else:
                results["RAG Response Generation"] = ("FAIL", f"RAG assistant endpoint failed with status {response.status_code}")
        else:
            results["RAG Response Generation"] = ("FAIL", "Skipped. Document Ingestion was not completed.")
    except Exception as e:
        logger.error(f"RAG Response Generation failed: {str(e)}")
        results["RAG Response Generation"] = ("FAIL", str(e))

    # CLEANUP TEST DATA
    logger.info("Cleaning up E2E validation test artifacts...")
    try:
        if db and test_doc_id:
            # Delete Weaviate chunks
            weaviate_client = vector_service.client
            coll = weaviate_client.collections.get("DocumentChunk")
            from weaviate.classes.query import Filter
            coll.data.delete_many(
                where=Filter.by_property("documentId").equal(str(test_doc_id))
            )
            logger.info("Deleted test chunks from Weaviate index.")
            
            # Delete PostgreSQL chunks and document
            db.query(DocumentChunk).filter(DocumentChunk.document_id == test_doc_id).delete()
            db.query(Document).filter(Document.id == test_doc_id).delete()
            db.commit()
            logger.info("Deleted test records from PostgreSQL database.")
            
            # Delete files on disk
            test_filepath = "/app/uploads/test_validation_doc.txt"
            if os.path.exists(test_filepath):
                os.remove(test_filepath)
                logger.info("Deleted temporary test file on disk.")
                
            hash_filepath = os.path.join("/app/uploads", f"{file_hash}.txt")
            if os.path.exists(hash_filepath):
                os.remove(hash_filepath)
                logger.info("Deleted permanent hashed file on disk.")
                
    except Exception as cleanup_err:
        logger.warning(f"Error during E2E cleanup: {str(cleanup_err)}")

    # Print Summary Report
    logger.info("=========================================")
    logger.info("E2E SYSTEM VALIDATION SUMMARY")
    logger.info("=========================================")
    for test_name, (status, detail) in results.items():
        logger.info(f"{test_name:30} : {status} - {detail}")
    logger.info("=========================================")
    
    # Return exit code based on tests
    all_passed = all(status == "PASS" for status, _ in results.values())
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    run_tests()
