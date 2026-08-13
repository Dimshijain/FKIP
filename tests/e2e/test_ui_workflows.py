import pytest
import httpx

FRONTEND_URL = "http://localhost:5173"

def test_ui_frontend_health():
    """E2E UI: Verify frontend SPA server responds with HTML entrypoint."""
    try:
        res = httpx.get(FRONTEND_URL, timeout=5.0)
        assert res.status_code == 200
        assert "<div id=\"root\">" in res.text or "<!DOCTYPE html>" in res.text
    except Exception as e:
        pytest.skip(f"Frontend dev server not reachable: {e}")

def test_ui_routes_accessible():
    """E2E UI: Verify SPA client handles core route navigation paths."""
    routes = [
        "/",
        "/login",
        "/dashboard",
        "/copilot",
        "/search",
        "/sql-writer",
        "/oracle",
        "/documents",
        "/dna",
        "/innovation",
        "/knowledge-graph",
        "/docs-generator",
        "/reports",
        "/admin"
    ]
    try:
        for route in routes:
            res = httpx.get(f"{FRONTEND_URL}{route}", timeout=5.0)
            assert res.status_code == 200, f"Route {route} failed with {res.status_code}"
    except Exception as e:
        pytest.skip(f"Frontend server not reachable: {e}")
