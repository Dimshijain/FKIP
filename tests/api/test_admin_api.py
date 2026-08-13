import pytest

def test_tc_adm_001_list_users(client, admin_headers):
    """TC-ADM-001: List registered platform users."""
    res = client.get("/admin/users", headers=admin_headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    users = res.json()
    assert isinstance(users, list)
    assert len(users) >= 1

def test_tc_adm_003_infrastructure_monitoring(client, admin_headers):
    """TC-ADM-003: Real-time infrastructure monitoring health check."""
    res = client.get("/admin/monitoring", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "postgres_status" in data or "users_count" in data or "cpu_percent" in data

def test_tc_adm_004_non_admin_access_block(client, consumer_headers):
    """TC-ADM-004: Non-admin users blocked from admin endpoints."""
    res = client.get("/admin/users", headers=consumer_headers)
    assert res.status_code == 403
