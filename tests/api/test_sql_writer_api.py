import pytest

def test_tc_sql_001_schema_tree_extraction(client, admin_headers):
    """TC-SQL-001: Extract database schema tree."""
    res = client.get("/sql/schema", headers=admin_headers)
    assert res.status_code == 200, f"Schema extraction failed: {res.text}"
    data = res.json()
    assert "tables" in data
    assert len(data["tables"]) > 0

def test_tc_sql_002_generate_oracle_sql(client, admin_headers):
    """TC-SQL-002: Synthesize Oracle SQL query."""
    res = client.post("/sql/generate", headers=admin_headers, json={
        "prompt": "List all departments with employee count",
        "dialect": "ORACLE"
    })
    assert res.status_code in [200, 201]
    data = res.json()
    assert "generated_sql" in data
    assert data["dialect"] == "ORACLE"
    assert data["is_safe"] is True

def test_tc_sql_003_generate_postgres_sql(client, admin_headers):
    """TC-SQL-003: Synthesize PostgreSQL query."""
    res = client.post("/sql/generate", headers=admin_headers, json={
        "prompt": "Select active users ordered by created date",
        "dialect": "POSTGRESQL"
    })
    assert res.status_code in [200, 201]
    data = res.json()
    assert "generated_sql" in data
    assert data["dialect"] == "POSTGRESQL"
    assert data["is_safe"] is True

def test_tc_sql_004_sql_formatting(client, admin_headers):
    """TC-SQL-004: Format SQL query."""
    res = client.post("/sql/format", headers=admin_headers, json={
        "sql": "select u.id, u.email from users u where u.role = 'ADMIN';",
        "dialect": "POSTGRESQL"
    })
    assert res.status_code == 200
    assert "formatted_sql" in res.json()
    assert "SELECT" in res.json()["formatted_sql"]

def test_tc_sql_005_sql_explain(client, admin_headers):
    """TC-SQL-005: Query execution plan analysis."""
    res = client.post("/sql/explain", headers=admin_headers, json={
        "sql": "SELECT * FROM departments;",
        "dialect": "POSTGRESQL"
    })
    assert res.status_code == 200
    assert "explanation" in res.json()

def test_tc_sql_006_safe_select_execution(client, admin_headers):
    """TC-SQL-006: Execute read-only SELECT query."""
    res = client.post("/sql/execute", headers=admin_headers, json={
        "sql": "SELECT department_name FROM departments LIMIT 5;",
        "dialect": "POSTGRESQL",
        "prompt": "Get departments"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "columns" in data
    assert "rows" in data
    assert "execution_time_ms" in data

def test_tc_sql_008_guardrail_ddl_blocking(client, admin_headers):
    """TC-SQL-008: Block destructive DDL statements."""
    res = client.post("/sql/execute", headers=admin_headers, json={
        "sql": "DROP TABLE departments;",
        "dialect": "POSTGRESQL"
    })
    assert res.status_code == 400
    assert "guardrail" in res.json()["detail"].lower()

def test_tc_sql_010_query_history(client, admin_headers):
    """TC-SQL-010: Query history tracking."""
    res = client.get("/sql/history", headers=admin_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_tc_sql_011_documentation_synthesis(client, admin_headers):
    """TC-SQL-011: Synthesize Technical Specification doc."""
    res = client.post("/sql/generate-docs", headers=admin_headers, json={
        "sql": "SELECT * FROM departments;",
        "dialect": "POSTGRESQL",
        "prompt": "List departments",
        "columns": ["department_name"],
        "row_count": 4,
        "execution_time_ms": 5.2
    })
    assert res.status_code == 200
    data = res.json()
    assert "title" in data
    assert "content" in data
    assert len(data["content"]) > 100
