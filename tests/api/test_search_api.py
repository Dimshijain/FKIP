import pytest

def test_tc_search_001_hybrid_search(client, admin_headers):
    """TC-SEARCH-001: Semantic keyword search across document chunks."""
    res = client.post("/search/hybrid", headers=admin_headers, json={
        "query": "architecture",
        "limit": 5
    })
    assert res.status_code == 200, f"Search failed: {res.text}"
    data = res.json()
    assert "results" in data
    assert isinstance(data["results"], list)

def test_tc_search_002_filter_by_document(client, admin_headers):
    """TC-SEARCH-002: Hybrid search with limit filtering."""
    res = client.post("/search/hybrid", headers=admin_headers, json={
        "query": "ledger",
        "limit": 3
    })
    assert res.status_code == 200
    results = res.json().get("results", [])
    assert len(results) <= 3

def test_tc_search_004_empty_search_query(client, admin_headers):
    """TC-SEARCH-004: Empty search query handling."""
    res = client.post("/search/hybrid", headers=admin_headers, json={
        "query": "",
        "limit": 5
    })
    assert res.status_code in [200, 400, 422]

def test_tc_search_005_conversational_rag_chat(client, admin_headers):
    """TC-SEARCH-005: Conversational RAG Assistant (POST /api/search/chat)."""
    res = client.post("/search/chat", headers=admin_headers, json={
        "messages": [
            {"role": "user", "content": "What is FKIP platform?"}
        ]
    })
    assert res.status_code == 200, f"RAG Chat failed: {res.text}"
    data = res.json()
    assert "response" in data
    assert "log_id" in data
    assert len(data["response"]) > 5

def test_tc_search_007_feedback_submission(client, admin_headers):
    """TC-SEARCH-007: Submit search feedback rating."""
    chat_res = client.post("/search/chat", headers=admin_headers, json={
        "messages": [
            {"role": "user", "content": "Explain core ledger."}
        ]
    })
    assert chat_res.status_code == 200
    log_id = chat_res.json()["log_id"]
    
    fb_res = client.post("/search/feedback", headers=admin_headers, json={
        "log_id": log_id,
        "rating": 5,
        "comments": "Accurate response"
    })
    assert fb_res.status_code in [200, 201]
