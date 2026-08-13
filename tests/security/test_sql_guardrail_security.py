import pytest
from tests.fixtures.test_data import UNSAFE_SQL_TEST_CASES

@pytest.mark.parametrize("sql_payload, description", UNSAFE_SQL_TEST_CASES)
def test_sec_sql_guardrails_blocking(client, admin_headers, sql_payload, description):
    """Security: Verify all DDL, DML mutations and SQL injection bypasses are strictly blocked."""
    res = client.post("/sql/execute", headers=admin_headers, json={
        "sql": sql_payload,
        "dialect": "POSTGRESQL",
        "prompt": f"Attempt {description}"
    })
    assert res.status_code == 400, f"Failed to block unsafe query ({description}): {sql_payload}"
    detail = res.json().get("detail", "").lower()
    assert "guardrail" in detail or "read-only" in detail or "select" in detail or "safety" in detail

def test_sec_sql_injection_union_probe(client, admin_headers):
    """Security: Verify UNION-based payload still enforces strict read-only execution."""
    res = client.post("/sql/execute", headers=admin_headers, json={
        "sql": "SELECT 1 UNION ALL SELECT 2;",
        "dialect": "POSTGRESQL"
    })
    # Safe SELECT UNION is allowed read-only
    assert res.status_code == 200
