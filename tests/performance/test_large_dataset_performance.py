import pytest
import time
import io
from tests.fixtures.test_data import SAMPLE_LARGE_DOC

def test_perf_large_document_ingestion_and_chunking(client, admin_headers):
    """Performance: Ingestion throughput of large 50-section technical specification."""
    timestamp = int(time.time())
    file_tuple = (f"large_perf_spec_{timestamp}.txt", io.BytesIO(SAMPLE_LARGE_DOC.encode("utf-8")), "text/plain")
    headers = {"Authorization": admin_headers["Authorization"]}
    
    t0 = time.perf_counter()
    upload_res = client.post("/documents/upload", headers=headers, files={"file": file_tuple})
    t1 = time.perf_counter()
    upload_latency_ms = (t1 - t0) * 1000.0
    
    assert upload_res.status_code in [200, 201, 202]
    doc_id = upload_res.json()["id"]
    
    # Ingestion API response should be fast (< 1500ms)
    assert upload_latency_ms < 1500.0
    
    # Clean up
    time.sleep(1)
    client.delete(f"/documents/{doc_id}", headers=admin_headers)

def test_perf_sql_execution_latency(client, admin_headers):
    """Performance: Benchmark SQL execution response time."""
    t0 = time.perf_counter()
    res = client.post("/sql/execute", headers=admin_headers, json={
        "sql": "SELECT * FROM departments;",
        "dialect": "POSTGRESQL"
    })
    t1 = time.perf_counter()
    duration_ms = (t1 - t0) * 1000.0
    
    assert res.status_code == 200
    assert duration_ms < 300.0, f"SQL execution exceeded latency threshold: {duration_ms}ms"
