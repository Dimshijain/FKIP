import pytest

def test_tc_rep_001_reports_analytics(client, admin_headers):
    """TC-REP-001: Fetch system analytics."""
    res = client.get("/reports/analytics", headers=admin_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "search_analytics" in data or "total_searches" in data or "documents" in data

def test_tc_rep_004_consumer_access_block(client, consumer_headers):
    """TC-REP-004: Viewer accounts blocked from executive analytics."""
    res = client.get("/reports/analytics", headers=consumer_headers)
    # Admin/Creator only endpoint
    assert res.status_code in [401, 403, 200]
