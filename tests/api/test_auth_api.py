import pytest
import time

def test_tc_auth_001_valid_admin_login(client):
    """TC-AUTH-001: Valid admin credentials authentication."""
    res = client.post("/auth/login", json={
        "email": "admin@finxsystems.com",
        "password": "password123"
    })
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "access_token" in data
    assert data.get("token_type") == "bearer"

def test_tc_auth_002_invalid_password(client):
    """TC-AUTH-002: Invalid password rejection."""
    res = client.post("/auth/login", json={
        "email": "admin@finxsystems.com",
        "password": "wrongpassword123"
    })
    assert res.status_code == 401
    assert "detail" in res.json()

def test_tc_auth_003_non_existent_user(client):
    """TC-AUTH-003: Non-existent user rejection."""
    res = client.post("/auth/login", json={
        "email": f"nonexistent_{int(time.time())}@unknown.com",
        "password": "password123"
    })
    assert res.status_code == 401

def test_tc_auth_004_user_registration(client):
    """TC-AUTH-004: New user signup with default CONSUMER role."""
    unique_email = f"testuser_{int(time.time())}@finxsystems.com"
    res = client.post("/auth/register", json={
        "email": unique_email,
        "password": "SecurePassword123!",
        "role": "CONSUMER"
    })
    assert res.status_code in [200, 201], f"Registration failed: {res.text}"
    data = res.json()
    assert data["email"] == unique_email
    assert data["role"] == "CONSUMER"

def test_tc_auth_005_duplicate_registration(client):
    """TC-AUTH-005: Duplicate email registration rejection."""
    res = client.post("/auth/register", json={
        "email": "admin@finxsystems.com",
        "password": "password123",
        "role": "ADMIN"
    })
    assert res.status_code == 400
    assert "already registered" in res.json()["detail"].lower()

def test_tc_auth_006_get_current_user_profile(client, admin_headers):
    """TC-AUTH-006: Retrieve authenticated user profile (/api/auth/me)."""
    res = client.get("/auth/me", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "admin@finxsystems.com"
    assert data["role"] == "ADMIN"

def test_tc_auth_007_missing_auth_header(client):
    """TC-AUTH-007: Request with missing Authorization header."""
    res = client.get("/auth/me")
    assert res.status_code == 401

def test_tc_auth_008_tampered_jwt_token(client):
    """TC-AUTH-008: Request with invalid/tampered token."""
    res = client.get("/auth/me", headers={"Authorization": "Bearer invalid_signature_jwt_token"})
    assert res.status_code == 401

def test_tc_auth_009_creator_role_authentication(client, creator_headers):
    """TC-AUTH-009: Creator account authentication and role verification."""
    res = client.get("/auth/me", headers=creator_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "creator@finxsystems.com"
    assert data["role"] == "CREATOR"

def test_tc_auth_010_consumer_role_authentication(client, consumer_headers):
    """TC-AUTH-010: Consumer account authentication and role verification."""
    res = client.get("/auth/me", headers=consumer_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "consumer@finxsystems.com"
    assert data["role"] == "CONSUMER"
