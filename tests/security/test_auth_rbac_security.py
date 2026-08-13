import pytest

def test_sec_unauthorized_endpoints(client):
    """Security: Verify protected endpoints reject unauthenticated requests."""
    protected_urls = [
        "/auth/me",
        "/reports/executive",
        "/sql/schema",
        "/oracle/objects",
        "/documents",
        "/dna/apps",
        "/innovation/opportunities",
        "/knowledge-graph",
        "/docs",
        "/admin/users"
    ]
    for url in protected_urls:
        res = client.get(url)
        assert res.status_code == 401, f"Endpoint {url} did not enforce 401 for unauthenticated request"

def test_sec_consumer_rbac_restrictions(client, consumer_headers):
    """Security: Verify Consumer role cannot access admin or creator restricted operations."""
    # 1. Admin users endpoint
    res1 = client.get("/admin/users", headers=consumer_headers)
    assert res1.status_code == 403
    
    # 2. Admin monitoring endpoint
    res2 = client.get("/admin/monitoring", headers=consumer_headers)
    assert res2.status_code == 403

def test_sec_jwt_token_tampering(client):
    """Security: Verify tampered or invalid JWT signatures are rejected."""
    tampered_headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_signature"}
    res = client.get("/auth/me", headers=tampered_headers)
    assert res.status_code == 401
