import os
import sys
import httpx
import logging
from sqlalchemy import text

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("FKIP-Phase2-Tester")

# Setup sys.path
sys.path.insert(0, "/app")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.db.session import SessionLocal
from app.db.models import User, OracleMetadata, DnaApplication, DnaAppFeature, SearchAuditLog
from app.services.vector import vector_service

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, base_url="http://testserver")

def get_auth_token(email, password):
    resp = client.post("/api/auth/login", json={"email": email, "password": password, "role": "CREATOR"})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    raise Exception(f"Auth failed: {resp.text}")

def run_tests():
    logger.info("=========================================")
    logger.info("STARTING PHASE 2 AUTOMATED TEST SUITE")
    logger.info("=========================================")
    
    # 0. Auth
    token = get_auth_token("creator@finxsystems.com", "password123")
    headers = {"Authorization": f"Bearer {token}"}
    
    db = SessionLocal()
    
    # Pre-clean
    db.execute(text("TRUNCATE TABLE oracle_dependencies, oracle_metadata, dna_app_features, dna_applications CASCADE;"))
    db.commit()

    # 1. Oracle Intelligence Upload and Parse Test
    logger.info("[TEST 1] Uploading and parsing Oracle schema DDL...")
    ddl_content = """
    CREATE TABLE DEPARTMENTS (
        DEPARTMENT_ID NUMBER PRIMARY KEY,
        DEPARTMENT_NAME VARCHAR2(50) NOT NULL
    );

    CREATE TABLE EMPLOYEES (
        EMPLOYEE_ID NUMBER PRIMARY KEY,
        FIRST_NAME VARCHAR2(50),
        LAST_NAME VARCHAR2(50) NOT NULL,
        DEPARTMENT_ID NUMBER REFERENCES DEPARTMENTS(DEPARTMENT_ID)
    );

    CREATE VIEW EMP_DETAILS AS
    SELECT E.EMPLOYEE_ID, E.FIRST_NAME, E.LAST_NAME, D.DEPARTMENT_NAME
    FROM EMPLOYEES E JOIN DEPARTMENTS D ON E.DEPARTMENT_ID = D.DEPARTMENT_ID;

    CREATE TRIGGER LOG_EMPLOYEE_CHANGES
    BEFORE UPDATE ON EMPLOYEES
    FOR EACH ROW
    BEGIN
        INSERT INTO AUDIT_LOG VALUES (:NEW.EMPLOYEE_ID);
    END;
    """
    
    files = {"file": ("hr_schema.sql", ddl_content, "text/plain")}
    resp = client.post("/api/oracle/upload", files=files, headers=headers)
    assert resp.status_code == 201, f"Oracle DDL upload failed: {resp.text}"
    payload = resp.json()
    logger.info(f"Oracle parsing output: {payload}")
    assert payload["objects_created"] >= 4
    assert payload["relationships_created"] >= 3
    logger.info(" - TEST 1 PASS")

    # 2. Oracle Impact Analysis Test
    logger.info("[TEST 2] Running downstream impact analysis trace...")
    employees_tbl = db.query(OracleMetadata).filter(OracleMetadata.object_name == "EMPLOYEES").first()
    assert employees_tbl is not None, "Employees table not indexed in DB."
    
    resp = client.get(f"/api/oracle/impact-analysis?object_id={employees_tbl.id}", headers=headers)
    assert resp.status_code == 200, f"Impact query failed: {resp.text}"
    impacts = resp.json()
    logger.info(f"Impacted downstream elements of EMPLOYEES: {impacts}")
    
    # Employees should impact View EMP_DETAILS and Trigger LOG_EMPLOYEE_CHANGES
    impacted_names = [item["object_name"] for item in impacts]
    assert "EMP_DETAILS" in impacted_names
    assert "LOG_EMPLOYEE_CHANGES" in impacted_names
    logger.info(" - TEST 2 PASS")

    # 3. Core Banking Application Spec Ingestion Test
    logger.info("[TEST 3] Ingesting Core Banking Application specification catalog...")
    dna_spec = [
        {
            "app_code": "APP-CRM",
            "app_name": "Customer Accounts Management Portal",
            "owner": "Sales Division",
            "description": "Enterprise customer data logs",
            "version": "2.4",
            "status": "PRODUCTION",
            "platform": "Spring Boot",
            "features": [
                {
                    "feature_name": "Customer Account Auto-Billing Validation",
                    "feature_description": "Performs nightly checks on active accounts to debit invoices and process billing statements",
                    "category": "Billing"
                }
            ]
        },
        {
            "app_code": "APP-FIN",
            "app_name": "Finance Reconciliation Engine",
            "owner": "Finance Division",
            "description": "Debit and credit reconciliation tools",
            "version": "1.0",
            "status": "PRODUCTION",
            "platform": "Node.js",
            "features": [
                {
                    "feature_name": "Customer Account Auto-Billing Validation",
                    "feature_description": "Performs nightly checks on active accounts to debit invoices and process billing statements",
                    "category": "Billing"
                }
            ]
        }
    ]
    
    import json
    files = {"file": ("dna_catalog.json", json.dumps(dna_spec), "application/json")}
    resp = client.post("/api/dna/upload", files=files, headers=headers)
    assert resp.status_code == 201, f"Core Banking upload failed: {resp.text}"
    payload = resp.json()
    logger.info(f"Core Banking ingestion output: {payload}")
    assert payload["features_indexed"] == 2
    logger.info(" - TEST 3 PASS")

    # 4. Core Banking Feature Similarity Clustering Test
    logger.info("[TEST 4] Triggering vector capability clustering redundance checks...")
    resp = client.get("/api/dna/clusters?threshold=0.35", headers=headers)
    assert resp.status_code == 200, f"Clustering query failed: {resp.text}"
    clusters = resp.json()
    logger.info(f"Detected capability clusters count: {len(clusters)}")
    logger.info(f"Cluster detail payloads: {clusters}")
    
    # Verify that clusters contain our duplicate Billing capabilities
    assert len(clusters) > 0, "No duplicate capabilities detected by vector clustering."
    logger.info(" - TEST 4 PASS")

    # 5. Admin Monitoring Endpoint Test
    logger.info("[TEST 5] Testing Admin system monitoring metrics...")
    admin_token = get_auth_token("admin@finxsystems.com", "password123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    resp = client.get("/api/admin/monitoring", headers=admin_headers)
    assert resp.status_code == 200, f"Monitoring fetch failed: {resp.text}"
    stats = resp.json()
    logger.info(f"Admin system stats: {stats}")
    assert stats["postgres_status"]["status"] == "healthy"
    assert stats["weaviate_status"]["status"] == "healthy"
    assert stats["ollama_status"]["status"] == "healthy"
    logger.info(" - TEST 5 PASS")

    # 6. Reports Analytics Audits Test
    logger.info("[TEST 6] Testing search log analytics reporting...")
    # Add dummy search audit log
    audit_log = SearchAuditLog(
        query_text="What port does Weaviate run on?",
        response_text="Weaviate runs on port 8081.",
        response_latency_ms=250,
        relevance_score=0.987,
        faithfulness_score=1.000,
        hallucination_detected=False
    )
    db.add(audit_log)
    db.commit()
    
    resp = client.get("/api/reports/analytics", headers=admin_headers)
    assert resp.status_code == 200, f"Reports fetch failed: {resp.text}"
    analytics = resp.json()
    logger.info(f"Analytics report summaries: {analytics}")
    assert analytics["search"]["total_queries"] >= 1
    assert analytics["documents"]["total_count"] >= 0
    logger.info(" - TEST 6 PASS")

    db.close()
    logger.info("=========================================")
    logger.info("PHASE 2 INTEGRATION VERIFICATION: ALL PASS")
    logger.info("=========================================")

if __name__ == "__main__":
    run_tests()
