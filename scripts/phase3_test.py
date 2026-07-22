import os
import sys
import httpx
import logging

sys.path.insert(0, "/app")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from fastapi.testclient import TestClient
from app.main import app

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] FKIP-Phase3-Tester: %(message)s")
logger = logging.getLogger(__name__)

client = TestClient(app, base_url="http://testserver")

def run_tests():
    logger.info("=========================================")
    logger.info("STARTING PHASE 3 AUTOMATED TEST SUITE")
    logger.info("=========================================")

    # 0. Authenticate & Obtain Access Token
    logger.info("Authenticating admin operator user...")
    login_payload = {
        "email": "admin@finxsystems.com",
        "password": "password123",
        "role": "ADMIN"
    }
    
    try:
        resp = client.post("/api/auth/login", json=login_payload)
        assert resp.status_code == 200, f"Authentication failed: {resp.text}"
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        logger.info("Authentication SUCCESS. Got access token.")
    except Exception as e:
        logger.error(f"Failed to login: {str(e)}")
        sys.exit(1)

    # 1. AI Copilot Chat Verification
    logger.info("[TEST 1] AI Copilot: Creating conversational session threads...")
    try:
        # Create thread
        resp = client.post("/api/copilot/conversations?title=IntegrationTestSession", headers=headers)
        assert resp.status_code == 201, f"Failed to create conversation: {resp.text}"
        conv_id = resp.json()["id"]
        logger.info(f"Created conversation. ID: {conv_id}")

        # Send chat message
        chat_payload = {
            "conversation_id": conv_id,
            "message": "Which database tables handle system authentication?"
        }
        logger.info("Sending chat message to AI Copilot...")
        resp = client.post("/api/copilot/chat", json=chat_payload, headers=headers)
        assert resp.status_code == 200, f"Chat failed: {resp.text}"
        
        chat_data = resp.json()
        assert "response" in chat_data, "Response missing from assistant reply."
        assert len(chat_data["suggestions"]) >= 3, "AI Copilot suggestions count must be 3 or more."
        assert isinstance(chat_data["recommendations"], list), "Recommendations must be a list."
        logger.info(f"AI Assistant Replied: {chat_data['response'][:100]}...")
        logger.info(f"Generated Suggestions: {chat_data['suggestions']}")
        logger.info(f"Context Recommendations Count: {len(chat_data['recommendations'])}")
        logger.info(" - TEST 1 PASS")
    except Exception as e:
        logger.error(f"TEST 1 FAIL: {str(e)}")
        sys.exit(1)

    # 2. Innovation Discovery Engine Verification
    logger.info("[TEST 2] Innovation Discovery: Seed document and analyze gaps...")
    try:
        # Upload mock file to seed chunks
        logger.info("Uploading mock document to seed ingestion content...")
        files = {"file": ("integration_test_doc.txt", "This is an integration test document content for FinXSystems Knowledge Intelligence Platform (FKIP). It mentions system architecture details and technical database configurations.", "text/plain")}
        upload_resp = client.post("/api/documents/upload", files=files, headers=headers)
        assert upload_resp.status_code in [201, 202], f"Failed to upload seed document: {upload_resp.text}"
        doc_id = upload_resp.json()["id"]
        logger.info(f"Mock document uploaded successfully. Seed ID: {doc_id}")

        # Poll status for indexing completion
        import time
        for idx in range(8):
            status_resp = client.get("/api/documents", headers=headers)
            if status_resp.status_code == 200:
                matching = [d for d in status_resp.json() if d["id"] == doc_id]
                if matching and matching[0]["status"] == "COMPLETED":
                    logger.info("Mock document ingestion completed successfully.")
                    break
            time.sleep(1.0)

        # Get documents list to find a test doc
        resp = client.get("/api/documents", headers=headers)
        assert resp.status_code == 200, f"Failed to get docs list: {resp.text}"
        docs = resp.json()
        
        doc_ids = []
        if docs:
            completed_docs = [d for d in docs if d["status"] == "COMPLETED"]
            if completed_docs:
                doc_ids = [completed_docs[0]["id"]]
                logger.info(f"Using document '{completed_docs[0]['filename']}' for gap analysis.")
            else:
                doc_ids = [docs[0]["id"]]
                logger.info(f"Fallback to non-completed document '{docs[0]['filename']}' for gap analysis.")
        else:
            logger.warning("No documents indexed. Gap analysis will run with empty documents.")
            
        # Run gaps audit
        analyze_payload = {"document_ids": doc_ids}
        resp = client.post("/api/innovation/analyze", json=analyze_payload, headers=headers)
        assert resp.status_code == 200, f"Gap analysis failed: {resp.text}"
        
        analysis_data = resp.json()
        assert "gaps" in analysis_data, "Discovered gaps list missing."
        assert len(analysis_data["ideas"]) > 0, "No innovation ideas proposed."
        logger.info(f"Discovered Gaps Count: {len(analysis_data['gaps'])}")
        logger.info(f"Discovered Idea: {analysis_data['ideas'][0]['name']}")
        
        # Approve opportunity
        idea = analysis_data["ideas"][0]
        approve_payload = {
            "name": idea["name"],
            "description": idea["description"],
            "source_type": "GENERAL",
            "business_value": idea["business_value"],
            "complexity": idea["complexity"],
            "priority": idea["priority"],
            "status": "BACKLOG"
        }
        resp = client.post("/api/innovation/opportunities", json=approve_payload, headers=headers)
        assert resp.status_code == 201, f"Failed to promote opportunity: {resp.text}"
        opp_data = resp.json()
        assert "opp_code" in opp_data, "opp_code missing from saved opportunity."
        opp_id = opp_data["id"]
        logger.info(f"Opportunity promoted successfully. Code: {opp_data['opp_code']}, ID: {opp_id}")
        
        # Update opportunity status
        resp = client.put(f"/api/innovation/opportunities/{opp_id}?status_val=IN_PROGRESS&priority_val=P1", headers=headers)
        assert resp.status_code == 200, f"Failed to update opportunity status: {resp.text}"
        logger.info("Successfully updated opportunity status to IN_PROGRESS.")
        logger.info(" - TEST 2 PASS")
    except Exception as e:
        logger.error(f"TEST 2 FAIL: {str(e)}")
        sys.exit(1)

    # 3. Connected Knowledge Graph Verification
    logger.info("[TEST 3] Connected Knowledge Graph: Fetching graph nodes & edges...")
    try:
        resp = client.get("/api/knowledge-graph", headers=headers)
        assert resp.status_code == 200, f"Failed to fetch knowledge graph: {resp.text}"
        
        graph_data = resp.json()
        assert "nodes" in graph_data, "Nodes list missing."
        assert "edges" in graph_data, "Edges list missing."
        logger.info(f"Knowledge Graph Nodes: {len(graph_data['nodes'])} items")
        logger.info(f"Knowledge Graph Edges: {len(graph_data['edges'])} items")
        logger.info(" - TEST 3 PASS")
    except Exception as e:
        logger.error(f"TEST 3 FAIL: {str(e)}")
        sys.exit(1)

    # 4. Documentation Generator Verification
    logger.info("[TEST 4] Documentation Generator: Creating technical SRS drafts...")
    try:
        doc_payload = {
            "doc_type": "SRS",
            "title": " FKIP System Software Requirements Specification"
        }
        resp = client.post("/api/docs/generate", json=doc_payload, headers=headers)
        assert resp.status_code == 201, f"Failed to generate documentation: {resp.text}"
        
        doc_data = resp.json()
        assert doc_data["doc_type"] == "SRS", "Document type mismatch."
        assert len(doc_data["content"]) > 100, "Generated content text is too short."
        doc_id = doc_data["id"]
        logger.info(f"Document Generated successfully. ID: {doc_id}")
        
        # Verify lists
        resp = client.get("/api/docs", headers=headers)
        assert resp.status_code == 200, f"Failed to fetch generated list: {resp.text}"
        assert len(resp.json()) > 0, "Specs list is empty."
        logger.info(" - TEST 4 PASS")
    except Exception as e:
        logger.error(f"TEST 4 FAIL: {str(e)}")
        sys.exit(1)

    # 5. Executive Dashboard Metrics Verification
    logger.info("[TEST 5] Executive Dashboard: Querying telemetry metrics reports...")
    try:
        resp = client.get("/api/reports/executive", headers=headers)
        assert resp.status_code == 200, f"Failed to query executive reports: {resp.text}"
        
        exec_data = resp.json()
        assert "ai_usage" in exec_data, "AI usage metrics missing."
        assert "knowledge_growth" in exec_data, "Knowledge growth stats missing."
        assert "system_health" in exec_data, "System health summary missing."
        logger.info(f"AI Queries Count: {exec_data['ai_usage']['total_queries']}")
        logger.info(f"System Health Status: Weaviate={exec_data['system_health']['weaviate']}, Ollama={exec_data['system_health']['ollama']}")
        logger.info(" - TEST 5 PASS")
    except Exception as e:
        logger.error(f"TEST 5 FAIL: {str(e)}")
        sys.exit(1)

    logger.info("=========================================")
    logger.info("PHASE 3 INTEGRATION VERIFICATION: ALL PASS")
    logger.info("=========================================")

if __name__ == "__main__":
    run_tests()
