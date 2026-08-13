import os
import sys
import pytest
import httpx

# Ensure proper encoding on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BASE_URL = os.getenv("FKIP_API_URL", "http://localhost:8000/api")

@pytest.fixture(scope="session")
def base_url():
    return BASE_URL

@pytest.fixture(scope="session")
def client():
    with httpx.Client(base_url=BASE_URL, timeout=35.0) as c:
        yield c

def get_auth_token(email: str, password: str = "password123") -> str:
    with httpx.Client(base_url=BASE_URL, timeout=15.0) as c:
        res = c.post("/auth/login", json={"email": email, "password": password})
        if res.status_code == 200:
            return res.json()["access_token"]
        # If user doesn't exist, register them
        reg_res = c.post("/auth/register", json={
            "email": email,
            "password": password,
            "full_name": email.split("@")[0].capitalize()
        })
        if reg_res.status_code in [200, 201]:
            # Login again
            login_res = c.post("/auth/login", json={"email": email, "password": password})
            return login_res.json()["access_token"]
        raise RuntimeError(f"Failed to authenticate user {email}: {res.text}")

@pytest.fixture(scope="session")
def admin_token():
    return get_auth_token("admin@finxsystems.com")

@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }

@pytest.fixture(scope="session")
def creator_token():
    return get_auth_token("creator@finxsystems.com")

@pytest.fixture(scope="session")
def creator_headers(creator_token):
    return {
        "Authorization": f"Bearer {creator_token}",
        "Content-Type": "application/json"
    }

@pytest.fixture(scope="session")
def consumer_token():
    return get_auth_token("consumer@finxsystems.com")

@pytest.fixture(scope="session")
def consumer_headers(consumer_token):
    return {
        "Authorization": f"Bearer {consumer_token}",
        "Content-Type": "application/json"
    }
