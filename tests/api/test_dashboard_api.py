import pytest

def test_tc_dash_001_executive_dashboard_load(client, admin_headers):
    """TC-DASH-001: Fetch executive dashboard telemetry metrics."""
    res = client.get("/reports/executive", headers=admin_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "ai_usage" in data
    assert "knowledge_growth" in data
    assert "user_activity" in data
    assert "innovation" in data
    assert "system_health" in data
    assert "total_queries" in data["ai_usage"]
    assert "documents_count" in data["knowledge_growth"]

def test_tc_dash_002_refresh_telemetry_cache_bypass(client, admin_headers):
    """TC-DASH-002: Refresh telemetry with cache invalidation (refresh=true)."""
    res = client.get("/reports/executive?refresh=true", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "system_health" in data
    assert "postgres" in data["system_health"]
    assert "weaviate" in data["system_health"]
    assert "ollama" in data["system_health"]

def test_tc_dash_003_system_health_telemetry(client, admin_headers):
    """TC-DASH-003: Verify system health pulse reporting."""
    res = client.get("/reports/executive", headers=admin_headers)
    assert res.status_code == 200
    health = res.json()["system_health"]
    assert health["postgres"] in ["healthy", "degraded", "offline"]
    assert "cpu_percent" in health
    assert "memory_percent" in health

def test_tc_dash_004_knowledge_growth_accuracy(client, admin_headers):
    """TC-DASH-004: Validate document and chunk counts in executive report."""
    exec_res = client.get("/reports/executive?refresh=true", headers=admin_headers)
    docs_res = client.get("/documents?limit=500", headers=admin_headers)
    assert exec_res.status_code == 200
    assert docs_res.status_code == 200
    
    total_docs = len(docs_res.json())
    reported_docs = exec_res.json()["knowledge_growth"]["documents_count"]
    assert reported_docs == total_docs
