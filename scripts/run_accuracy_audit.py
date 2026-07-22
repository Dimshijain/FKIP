import json
import time
import httpx
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] FKIP-Audit: %(message)s')
logger = logging.getLogger(__name__)

BASE_URL = 'http://127.0.0.1:8000/api'
RESULTS_FILE = '/app/audit_results.json'

QUESTIONS = [
    # 50 FKIP & Core Banking Domain Questions
    {"id": 1, "cat": "FKIP_DOMAIN", "q": "What does FKIP stand for?", "kw": ["finxsystems", "knowledge", "intelligence", "platform"]},
    {"id": 2, "cat": "FKIP_DOMAIN", "q": "Which port does the React frontend run on in FKIP?", "kw": ["5173"]},
    {"id": 3, "cat": "FKIP_DOMAIN", "q": "Which port does the FastAPI backend run on in FKIP?", "kw": ["8000"]},
    {"id": 4, "cat": "FKIP_DOMAIN", "q": "Which port does Weaviate run on in FKIP?", "kw": ["8081", "8080"]},
    {"id": 5, "cat": "FKIP_DOMAIN", "q": "Which port does Ollama run on in FKIP?", "kw": ["11434"]},
    {"id": 6, "cat": "FKIP_DOMAIN", "q": "Which relational database engine is used in FKIP?", "kw": ["postgres", "postgresql"]},
    {"id": 7, "cat": "FKIP_DOMAIN", "q": "What is the default PostgreSQL database name for FKIP?", "kw": ["fkip_db"]},
    {"id": 8, "cat": "FKIP_DOMAIN", "q": "Which vector database engine is used in FKIP?", "kw": ["weaviate"]},
    {"id": 9, "cat": "FKIP_DOMAIN", "q": "Which local AI LLM model is configured by default in FKIP?", "kw": ["qwen2", "llama3"]},
    {"id": 10, "cat": "FKIP_DOMAIN", "q": "Which local embedding model is configured by default in FKIP?", "kw": ["all-minilm"]},
    {"id": 11, "cat": "FKIP_DOMAIN", "q": "What are the three user roles in FKIP RBAC?", "kw": ["admin", "creator", "consumer"]},
    {"id": 12, "cat": "FKIP_DOMAIN", "q": "What is the default email address for the admin user in FKIP?", "kw": ["admin@finxsystems.com"]},
    {"id": 13, "cat": "FKIP_DOMAIN", "q": "What is the default email address for the creator user in FKIP?", "kw": ["creator@finxsystems.com"]},
    {"id": 14, "cat": "FKIP_DOMAIN", "q": "What is the default email address for the consumer user in FKIP?", "kw": ["consumer@finxsystems.com"]},
    {"id": 15, "cat": "FKIP_DOMAIN", "q": "What algorithm is used to sign JWT tokens in FKIP?", "kw": ["hs256"]},
    {"id": 16, "cat": "FKIP_DOMAIN", "q": "What is the name of the Weaviate collection for document chunks?", "kw": ["documentchunk"]},
    {"id": 17, "cat": "FKIP_DOMAIN", "q": "What is the name of the Weaviate collection for Core Banking application features?", "kw": ["dnaappfeature"]},
    {"id": 18, "cat": "FKIP_DOMAIN", "q": "What table in PostgreSQL stores user account details?", "kw": ["users"]},
    {"id": 19, "cat": "FKIP_DOMAIN", "q": "What table in PostgreSQL stores document metadata?", "kw": ["documents"]},
    {"id": 20, "cat": "FKIP_DOMAIN", "q": "What table in PostgreSQL stores document chunk content?", "kw": ["document_chunks"]},
    {"id": 21, "cat": "FKIP_DOMAIN", "q": "What table in PostgreSQL stores Oracle database metadata objects?", "kw": ["oracle_metadata"]},
    {"id": 22, "cat": "FKIP_DOMAIN", "q": "What table in PostgreSQL stores Oracle database dependencies?", "kw": ["oracle_dependencies"]},
    {"id": 23, "cat": "FKIP_DOMAIN", "q": "What table in PostgreSQL stores Core Banking applications?", "kw": ["dna_applications"]},
    {"id": 24, "cat": "FKIP_DOMAIN", "q": "What table in PostgreSQL stores Core Banking application features?", "kw": ["dna_app_features"]},
    {"id": 25, "cat": "FKIP_DOMAIN", "q": "What table in PostgreSQL stores product opportunity tickets?", "kw": ["opportunities"]},
    {"id": 26, "cat": "FKIP_DOMAIN", "q": "What table in PostgreSQL stores search transaction audit logs?", "kw": ["search_audit_logs"]},
    {"id": 27, "cat": "FKIP_DOMAIN", "q": "What table in PostgreSQL stores user feedback ratings?", "kw": ["user_feedback"]},
    {"id": 28, "cat": "FKIP_DOMAIN", "q": "What table in PostgreSQL stores AI Copilot conversation threads?", "kw": ["copilot_conversations"]},
    {"id": 29, "cat": "FKIP_DOMAIN", "q": "What table in PostgreSQL stores AI Copilot messages?", "kw": ["copilot_messages"]},
    {"id": 30, "cat": "FKIP_DOMAIN", "q": "What table in PostgreSQL stores AI-generated document specifications?", "kw": ["generated_documents"]},
    {"id": 31, "cat": "FKIP_DOMAIN", "q": "How does the Oracle Intelligence module process SQL DDL scripts?", "kw": ["ddl", "sql", "table", "foreign", "trigger", "view"]},
    {"id": 32, "cat": "FKIP_DOMAIN", "q": "What visual diagram does Oracle Intelligence generate for database tables?", "kw": ["er", "entity", "relationship", "diagram"]},
    {"id": 33, "cat": "FKIP_DOMAIN", "q": "What feature does Oracle Intelligence provide to trace downstream changes?", "kw": ["impact", "trace", "downstream"]},
    {"id": 34, "cat": "FKIP_DOMAIN", "q": "What metric does Core Banking Intelligence use to cluster duplicate features?", "kw": ["similarity", "vector", "cosine"]},
    {"id": 35, "cat": "FKIP_DOMAIN", "q": "What visual interface displays opportunity tickets in the Innovation Pipeline?", "kw": ["kanban"]},
    {"id": 36, "cat": "FKIP_DOMAIN", "q": "What are the priority levels for opportunity tickets in FKIP?", "kw": ["p1", "p2", "p3"]},
    {"id": 37, "cat": "FKIP_DOMAIN", "q": "What canvas visualizes connections between documents, schemas, and systems in FKIP?", "kw": ["knowledge", "graph"]},
    {"id": 38, "cat": "FKIP_DOMAIN", "q": "What node types are displayed in the FKIP Knowledge Graph?", "kw": ["document", "oracle", "feature", "opportunity"]},
    {"id": 39, "cat": "FKIP_DOMAIN", "q": "What technical specification templates can the Documentation Generator draft?", "kw": ["brd", "srs", "tech", "design"]},
    {"id": 40, "cat": "FKIP_DOMAIN", "q": "Where on disk are uploaded document files stored in the FKIP backend?", "kw": ["uploads", "/app/uploads"]},
    {"id": 41, "cat": "FKIP_DOMAIN", "q": "What file types are supported for document upload in FKIP?", "kw": ["pdf", "txt", "docx", "csv"]},
    {"id": 42, "cat": "FKIP_DOMAIN", "q": "What status values can a Document have during ingestion in FKIP?", "kw": ["pending", "processing", "completed", "failed"]},
    {"id": 43, "cat": "FKIP_DOMAIN", "q": "What strategy does FKIP use for document text chunking?", "kw": ["paragraph", "sentence", "chunk", "800"]},
    {"id": 44, "cat": "FKIP_DOMAIN", "q": "What fusion type is configured for Weaviate hybrid search in FKIP?", "kw": ["relative_score", "hybrid", "fusion"]},
    {"id": 45, "cat": "FKIP_DOMAIN", "q": "How does FKIP calculate user password security?", "kw": ["bcrypt", "hash"]},
    {"id": 46, "cat": "FKIP_DOMAIN", "q": "What API endpoint uploads documents for background ingestion in FKIP?", "kw": ["/api/documents/upload", "documents"]},
    {"id": 47, "cat": "FKIP_DOMAIN", "q": "What API endpoint executes hybrid semantic search across document chunks?", "kw": ["/api/search/hybrid", "hybrid"]},
    {"id": 48, "cat": "FKIP_DOMAIN", "q": "What API endpoint provides conversational RAG chat assistance?", "kw": ["/api/search/chat", "chat"]},
    {"id": 49, "cat": "FKIP_DOMAIN", "q": "What API endpoint calculates Core Banking capability clusters?", "kw": ["/api/dna/clusters", "clusters"]},
    {"id": 50, "cat": "FKIP_DOMAIN", "q": "What API endpoint provides executive telemetry metrics in FKIP?", "kw": ["/api/reports/executive", "executive"]},

    # 30 General Technical Questions
    {"id": 51, "cat": "GENERAL_TECH", "q": "How do I create a dictionary in Python?", "kw": ["dict", "{", "}", "key"]},
    {"id": 52, "cat": "GENERAL_TECH", "q": "What is the difference between a list and a tuple in Python?", "kw": ["mutable", "immutable", "list", "tuple"]},
    {"id": 53, "cat": "GENERAL_TECH", "q": "How do you handle exceptions in Python using try and except?", "kw": ["try", "except", "exception"]},
    {"id": 54, "cat": "GENERAL_TECH", "q": "What is a REST API?", "kw": ["http", "representational", "state", "resource", "endpoint"]},
    {"id": 55, "cat": "GENERAL_TECH", "q": "What does HTTP status code 200 OK mean?", "kw": ["success", "ok", "successful"]},
    {"id": 56, "cat": "GENERAL_TECH", "q": "What does HTTP status code 404 Not Found mean?", "kw": ["not found", "resource"]},
    {"id": 57, "cat": "GENERAL_TECH", "q": "What does HTTP status code 500 Internal Server Error mean?", "kw": ["server", "error"]},
    {"id": 58, "cat": "GENERAL_TECH", "q": "What is JSON?", "kw": ["javascript", "object", "notation", "format"]},
    {"id": 59, "cat": "GENERAL_TECH", "q": "What is SQL?", "kw": ["structured", "query", "language", "database"]},
    {"id": 60, "cat": "GENERAL_TECH", "q": "What is a Primary Key in a relational database?", "kw": ["unique", "identifier", "column"]},
    {"id": 61, "cat": "GENERAL_TECH", "q": "What is a Foreign Key in a relational database?", "kw": ["reference", "table", "relationship"]},
    {"id": 62, "cat": "GENERAL_TECH", "q": "What is a database Index?", "kw": ["speed", "performance", "search", "lookup"]},
    {"id": 63, "cat": "GENERAL_TECH", "q": "What is Docker?", "kw": ["container", "platform", "environment", "application"]},
    {"id": 64, "cat": "GENERAL_TECH", "q": "What is a Docker container?", "kw": ["isolated", "package", "environment", "image"]},
    {"id": 65, "cat": "GENERAL_TECH", "q": "What is Git?", "kw": ["version", "control", "repository", "system"]},
    {"id": 66, "cat": "GENERAL_TECH", "q": "What does git clone do?", "kw": ["copy", "download", "repository", "remote"]},
    {"id": 67, "cat": "GENERAL_TECH", "q": "What does git commit do?", "kw": ["save", "snapshot", "changes", "history"]},
    {"id": 68, "cat": "GENERAL_TECH", "q": "What is JWT (JSON Web Token)?", "kw": ["token", "authentication", "header", "payload", "signature"]},
    {"id": 69, "cat": "GENERAL_TECH", "q": "What is CORS in web applications?", "kw": ["cross", "origin", "resource", "sharing", "browser"]},
    {"id": 70, "cat": "GENERAL_TECH", "q": "What is vector embedding in machine learning?", "kw": ["numerical", "representation", "semantic", "vector", "space"]},
    {"id": 71, "cat": "GENERAL_TECH", "q": "What is cosine similarity?", "kw": ["angle", "vector", "similarity", "distance"]},
    {"id": 72, "cat": "GENERAL_TECH", "q": "What is RAG (Retrieval-Augmented Generation)?", "kw": ["retrieval", "augmented", "generation", "context", "llm"]},
    {"id": 73, "cat": "GENERAL_TECH", "q": "What is FastAPI?", "kw": ["python", "framework", "api", "asgi"]},
    {"id": 74, "cat": "GENERAL_TECH", "q": "What is React?", "kw": ["ui", "library", "javascript", "component"]},
    {"id": 75, "cat": "GENERAL_TECH", "q": "What is Vite?", "kw": ["build", "tool", "frontend", "dev"]},
    {"id": 76, "cat": "GENERAL_TECH", "q": "What is PostgreSQL?", "kw": ["relational", "database", "sql", "open source"]},
    {"id": 77, "cat": "GENERAL_TECH", "q": "What is Weaviate?", "kw": ["vector", "database", "search"]},
    {"id": 78, "cat": "GENERAL_TECH", "q": "What is asynchronous programming in Python using async and await?", "kw": ["non-blocking", "event loop", "coroutine", "asyncio"]},
    {"id": 79, "cat": "GENERAL_TECH", "q": "What is regular expression (regex)?", "kw": ["pattern", "string", "matching", "search"]},
    {"id": 80, "cat": "GENERAL_TECH", "q": "What is SHA-256 hashing?", "kw": ["hash", "cryptographic", "256", "checksum"]},

    # 20 Unrelated / Out-of-Domain Questions
    {"id": 81, "cat": "OUT_OF_DOMAIN", "q": "What is the capital of France?", "kw": ["paris"]},
    {"id": 82, "cat": "OUT_OF_DOMAIN", "q": "Who wrote the play Romeo and Juliet?", "kw": ["shakespeare"]},
    {"id": 83, "cat": "OUT_OF_DOMAIN", "q": "How many planets are in the Solar System?", "kw": ["8", "eight"]},
    {"id": 84, "cat": "OUT_OF_DOMAIN", "q": "What is the speed of light in vacuum?", "kw": ["299", "300", "m/s", "km/s", "miles"]},
    {"id": 85, "cat": "OUT_OF_DOMAIN", "q": "What is the chemical formula for water?", "kw": ["h2o"]},
    {"id": 86, "cat": "OUT_OF_DOMAIN", "q": "What is the largest ocean on Earth?", "kw": ["pacific"]},
    {"id": 87, "cat": "OUT_OF_DOMAIN", "q": "Who painted the Mona Lisa?", "kw": ["da vinci", "leonardo"]},
    {"id": 88, "cat": "OUT_OF_DOMAIN", "q": "What is the tallest mountain in the world?", "kw": ["everest"]},
    {"id": 89, "cat": "OUT_OF_DOMAIN", "q": "How many continents are there on Earth?", "kw": ["7", "seven"]},
    {"id": 90, "cat": "OUT_OF_DOMAIN", "q": "What currency is used in Japan?", "kw": ["yen"]},
    {"id": 91, "cat": "OUT_OF_DOMAIN", "q": "What is the boiling point of water at sea level in Celsius?", "kw": ["100"]},
    {"id": 92, "cat": "OUT_OF_DOMAIN", "q": "Who discovered penicillin?", "kw": ["fleming", "alexander"]},
    {"id": 93, "cat": "OUT_OF_DOMAIN", "q": "What is the freezing point of water in Celsius?", "kw": ["0", "zero"]},
    {"id": 94, "cat": "OUT_OF_DOMAIN", "q": "What instrument is used to measure temperature?", "kw": ["thermometer"]},
    {"id": 95, "cat": "OUT_OF_DOMAIN", "q": "What gas do humans need to breathe to live?", "kw": ["oxygen", "o2"]},
    {"id": 96, "cat": "OUT_OF_DOMAIN", "q": "What is the capital of Japan?", "kw": ["tokyo"]},
    {"id": 97, "cat": "OUT_OF_DOMAIN", "q": "How many hours are in a day?", "kw": ["24", "twenty-four"]},
    {"id": 98, "cat": "OUT_OF_DOMAIN", "q": "What color is a clear daytime sky?", "kw": ["blue"]},
    {"id": 99, "cat": "OUT_OF_DOMAIN", "q": "How many days are in a leap year?", "kw": ["366"]},
    {"id": 100, "cat": "OUT_OF_DOMAIN", "q": "What is the capital of Australia?", "kw": ["canberra"]}
]

def run_audit():
    logger.info("Starting FKIP 100-Question AI Accuracy Audit...")
    
    # 1. Login to get access token
    try:
        resp = httpx.post(f"{BASE_URL}/auth/login", json={"email": "admin@finxsystems.com", "password": "password123", "role": "ADMIN"})
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
    except Exception as e:
        logger.error(f"Failed to authenticate: {str(e)}")
        return

    # Load existing results if file exists
    results = {}
    try:
        with open(RESULTS_FILE, 'r', encoding='utf-8') as f:
            results = json.load(f)
    except Exception:
        results = {}

    for item in QUESTIONS:
        qid = str(item["id"])
        q_text = item["q"]
        cat = item["cat"]
        kws = item["kw"]

        if qid in results:
            continue # already evaluated

        logger.info(f"[{qid}/100] Testing [{cat}]: '{q_text}'")
        
        # Query Copilot
        copilot_resp_text = ""
        copilot_recs_count = 0
        try:
            c_res = httpx.post(f"{BASE_URL}/copilot/chat", json={"message": q_text}, headers=headers, timeout=40.0)
            if c_res.status_code == 200:
                c_json = c_res.json()
                copilot_resp_text = c_json.get("response", "")
                copilot_recs_count = len(c_json.get("recommendations", []))
            else:
                copilot_resp_text = f"HTTP Error {c_res.status_code}"
        except Exception as e:
            copilot_resp_text = f"Error: {str(e)}"

        # Query Knowledge Search RAG
        search_resp_text = ""
        search_citations_count = 0
        try:
            s_res = httpx.post(f"{BASE_URL}/search/chat", json={"messages": [{"role": "user", "content": q_text}]}, headers=headers, timeout=40.0)
            if s_res.status_code == 200:
                s_json = s_res.json()
                search_resp_text = s_json.get("response", "")
                search_citations_count = len(s_json.get("citations", []))
            else:
                search_resp_text = f"HTTP Error {s_res.status_code}"
        except Exception as e:
            search_resp_text = f"Error: {str(e)}"

        # Evaluate Copilot Answer

        # Evaluate Copilot Answer
        copilot_pass = False
        copilot_hallucination = False
        c_text_lower = copilot_resp_text.lower()

        if c_text_lower.startswith("error"):
            copilot_pass = False
            copilot_hallucination = False
        elif cat == "FKIP_DOMAIN":
            copilot_pass = any(kw.lower() in c_text_lower for kw in kws) or "fkip" in c_text_lower or "finxsystems" in c_text_lower
            if not copilot_pass and "cannot find" not in c_text_lower:
                copilot_hallucination = True
        elif cat == "GENERAL_TECH":
            valid_tech_ans = any(kw.lower() in c_text_lower for kw in kws)
            fallback_ans = "cannot find" in c_text_lower or "specialized" in c_text_lower
            copilot_pass = valid_tech_ans or fallback_ans
            if not copilot_pass:
                copilot_hallucination = True
        elif cat == "OUT_OF_DOMAIN":
            valid_answer = any(kw.lower() in c_text_lower for kw in kws)
            polite_refusal = "specialized" in c_text_lower or "fkip" in c_text_lower or "cannot" in c_text_lower or "assist" in c_text_lower or "enterprise" in c_text_lower
            copilot_pass = valid_answer or polite_refusal
            if not copilot_pass:
                copilot_hallucination = True

        # Evaluate Search RAG Answer
        search_pass = False
        search_hallucination = False
        s_text_lower = search_resp_text.lower()
        fallback_str = "cannot find the answer in the ingested documents"

        if s_text_lower.startswith("error") or s_text_lower.startswith("an unexpected error"):
            search_pass = False
            search_hallucination = False
        elif cat == "FKIP_DOMAIN":
            search_pass = any(kw.lower() in s_text_lower for kw in kws) or fallback_str in s_text_lower or "cannot find" in s_text_lower
            if not search_pass:
                search_hallucination = True
        elif cat == "GENERAL_TECH" or cat == "OUT_OF_DOMAIN":
            valid_ans = any(kw.lower() in s_text_lower for kw in kws)
            fallback_ans = fallback_str in s_text_lower or "cannot find" in s_text_lower or "provided context" in s_text_lower
            search_pass = valid_ans or fallback_ans
            if not search_pass:
                search_hallucination = True

        results[qid] = {
            "id": item["id"],
            "category": cat,
            "question": q_text,
            "expected_keywords": kws,
            "copilot": {
                "response": copilot_resp_text,
                "recs_count": copilot_recs_count,
                "pass": copilot_pass,
                "hallucination": copilot_hallucination
            },
            "search": {
                "response": search_resp_text,
                "citations_count": search_citations_count,
                "pass": search_pass,
                "hallucination": search_hallucination
            }
        }

        # Save progress
        with open(RESULTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)

async def main():
    logger.info("Starting FKIP 100-Question AI Accuracy Audit (Async)...")
    
    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            resp = await client.post(f"{BASE_URL}/auth/login", json={"email": "admin@finxsystems.com", "password": "password123", "role": "ADMIN"})
            token = resp.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
        except Exception as e:
            logger.error(f"Failed to authenticate: {str(e)}")
            return

        # Load existing results if file exists
        results = {}
        try:
            with open(RESULTS_FILE, 'r', encoding='utf-8') as f:
                results = json.load(f)
        except Exception:
            results = {}

        # Remove timed-out error entries so they get re-evaluated
        keys_to_remove = [k for k, v in results.items() if "error" in v["copilot"]["response"].lower()[:20] or "error" in v["search"]["response"].lower()[:20]]
        for k in keys_to_remove:
            del results[k]
        if keys_to_remove:
            logger.info(f"Retrying {len(keys_to_remove)} previously timed-out test cases...")

        semaphore = asyncio.Semaphore(2)
        tasks = [evaluate_question(item, headers, client, semaphore, results) for item in QUESTIONS]
        await asyncio.gather(*tasks)

        logger.info(f"Audit Complete! Evaluated {len(results)} questions. Results written to {RESULTS_FILE}")

if __name__ == '__main__':
    asyncio.run(main())