import pytest

def test_sql_writer_complete_workflow(client, admin_headers):
    """Integration Test: Natural Language -> Generate SQL -> Validate -> Execute -> Results -> Documentation."""
    # 1. Generate SQL
    gen_res = client.post("/sql/generate", headers=admin_headers, json={
        "prompt": "List all Oracle schema objects with object type and owner",
        "dialect": "POSTGRESQL"
    })
    assert gen_res.status_code in [200, 201]
    gen_data = gen_res.json()
    assert "generated_sql" in gen_data
    
    # 2. Format SQL
    test_sql = "SELECT object_name, object_type, owner FROM oracle_metadata ORDER BY object_name ASC LIMIT 5;"
    fmt_res = client.post("/sql/format", headers=admin_headers, json={
        "sql": test_sql,
        "dialect": "POSTGRESQL"
    })
    assert fmt_res.status_code == 200
    formatted_sql = fmt_res.json()["formatted_sql"]
    
    # 3. Explain Plan
    exp_res = client.post("/sql/explain", headers=admin_headers, json={
        "sql": formatted_sql,
        "dialect": "POSTGRESQL"
    })
    assert exp_res.status_code == 200
    assert "explanation" in exp_res.json()
    
    # 4. Safe Execution against real PostgreSQL table
    exec_res = client.post("/sql/execute", headers=admin_headers, json={
        "sql": formatted_sql,
        "dialect": "POSTGRESQL",
        "prompt": "List all Oracle schema objects"
    })
    assert exec_res.status_code == 200
    exec_data = exec_res.json()
    assert exec_data["success"] is True
    assert "rows" in exec_data
    assert "columns" in exec_data
    assert len(exec_data["columns"]) == 3
    
    # 5. Generate Documentation Spec
    doc_res = client.post("/sql/generate-docs", headers=admin_headers, json={
        "sql": formatted_sql,
        "dialect": "POSTGRESQL",
        "prompt": "List all Oracle schema objects",
        "columns": exec_data["columns"],
        "row_count": len(exec_data["rows"]),
        "execution_time_ms": exec_data.get("execution_time_ms", 1.0)
    })
    assert doc_res.status_code == 200
    doc_data = doc_res.json()
    assert "title" in doc_data
    assert "content" in doc_data
    
    # 6. Save as Custom Document
    save_res = client.post("/docs/custom", headers=admin_headers, json={
        "title": doc_data["title"],
        "doc_type": "TECH_DESIGN",
        "content": doc_data["content"]
    })
    assert save_res.status_code == 201
    saved_doc_id = save_res.json()["id"]
    
    # Cleanup saved doc
    client.delete(f"/docs/{saved_doc_id}", headers=admin_headers)
