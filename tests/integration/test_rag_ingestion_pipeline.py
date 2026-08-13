import pytest
import time
import io

def test_rag_ingestion_to_search_pipeline(client, admin_headers):
    """Integration Test: Document Upload -> Processing -> Chunking -> Vector Search."""
    timestamp = int(time.time())
    unique_keyword = f"QuantumVaultCore_{timestamp}"
    content = f"""# {unique_keyword} Architecture Specification
The {unique_keyword} subsystem provides distributed cryptographic key storage and automated reconciliation for core banking ledgers.
It guarantees sub-second settlement times and full ACID compliance across multi-region banking clusters.
"""
    file_tuple = (f"spec_{timestamp}.txt", io.BytesIO(content.encode("utf-8")), "text/plain")
    headers = {"Authorization": admin_headers["Authorization"]}
    
    # 1. Upload document
    upload_res = client.post("/documents/upload", headers=headers, files={"file": file_tuple})
    assert upload_res.status_code in [200, 201, 202], f"Upload failed: {upload_res.text}"
    doc_id = upload_res.json()["id"]
    
    # 2. Search for unique keyword in hybrid search
    search_res = client.post("/search/hybrid", headers=admin_headers, json={
        "query": unique_keyword,
        "limit": 5
    })
    assert search_res.status_code == 200
