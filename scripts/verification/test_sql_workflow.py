import sys
import time
import json
import httpx

BASE_URL = "http://localhost:8000/api"

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def run_sql_workflow_tests():
    print("=" * 70)
    print("[START] TESTING FKIP SQL WRITER EXECUTE & DOCUMENTATION WORKFLOW")
    print("=" * 70)

    # 1. Login
    login_res = httpx.post(
        f"{BASE_URL}/auth/login",
        json={"email": "admin@finxsystems.com", "password": "password123"},
        timeout=15.0
    )
    assert login_res.status_code == 200, "Login failed"
    token = login_res.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    print("[AUTH] Successfully authenticated as admin.")

    # 2. Test SQL Schema Tree
    schema_res = httpx.get(f"{BASE_URL}/sql/schema", headers=headers, timeout=10.0)
    assert schema_res.status_code == 200, "Failed to get schema tree"
    tables = schema_res.json().get("tables", [])
    print(f"[SCHEMA] Retrieved {len(tables)} database schema objects (Tables, Views, Triggers)")
    assert len(tables) > 0, "No tables in schema"

    # 3. Test Generate SQL Query
    gen_res = httpx.post(
        f"{BASE_URL}/sql/generate",
        headers=headers,
        json={"prompt": "Retrieve all departments with employee counts and average salary", "dialect": "POSTGRESQL"},
        timeout=20.0
    )
    assert gen_res.status_code == 201, f"SQL generate failed: {gen_res.status_code}"
    gen_data = gen_res.json()
    sql_text = gen_data["generated_sql"]
    history_id = gen_data["id"]
    print(f"[GENERATE] Generated SQL Query (ID: {history_id}):\n  {sql_text[:120]}...")
    assert gen_data["is_safe"] is True, "Generated SELECT query should be marked safe"

    # 4. Test Format & Explain
    fmt_res = httpx.post(f"{BASE_URL}/sql/format", headers=headers, json={"sql": sql_text, "dialect": "POSTGRESQL"})
    assert fmt_res.status_code == 200, "Format SQL failed"
    
    exp_res = httpx.post(f"{BASE_URL}/sql/explain", headers=headers, json={"sql": sql_text, "dialect": "POSTGRESQL"})
    assert exp_res.status_code == 200, "Explain SQL failed"
    print(f"[EXPLAIN] Query Execution Plan breakdown generated successfully.")

    # 5. Test Execute Safe SELECT Query (Run Query)
    exec_res = httpx.post(
        f"{BASE_URL}/sql/execute",
        headers=headers,
        json={"sql": "SELECT d.department_name, COUNT(e.id) AS employee_count, AVG(e.salary) AS avg_salary FROM departments d LEFT JOIN employees e ON e.department_id = d.department_id GROUP BY d.department_name ORDER BY avg_salary DESC LIMIT 10;", "dialect": "POSTGRESQL", "history_id": history_id},
        timeout=15.0
    )
    assert exec_res.status_code == 200, f"Execute SQL failed: {exec_res.status_code}"
    exec_data = exec_res.json()
    assert exec_data["success"] is True, "Execute query should be successful"
    assert len(exec_data["columns"]) > 0, "Columns should be returned"
    assert exec_data["row_count"] > 0, "Rows should be returned"
    print(f"[EXECUTE] Query executed successfully in {exec_data['execution_time_ms']}ms!")
    print(f"   * Columns: {exec_data['columns']}")
    print(f"   * Total Rows: {exec_data['row_count']}")
    print(f"   * Sample Row: {exec_data['rows'][0]}")

    # 6. Test Safety Guardrail Enforcement (Blocks DDL/DML)
    unsafe_queries = [
        "DROP TABLE departments;",
        "DELETE FROM employees WHERE id = 101;",
        "UPDATE employees SET salary = 999999;",
        "TRUNCATE TABLE users;",
        "SELECT * FROM departments; DROP TABLE users; --"
    ]
    for u_sql in unsafe_queries:
        u_res = httpx.post(
            f"{BASE_URL}/sql/execute",
            headers=headers,
            json={"sql": u_sql, "dialect": "POSTGRESQL"}
        )
        assert u_res.status_code == 400, f"Unsafe query '{u_sql}' was NOT blocked (Status: {u_res.status_code})"
        print(f"[GUARDRAIL] Successfully blocked destructive query: '{u_sql[:35]}...'")

    # 7. Test Query History Tracking
    hist_res = httpx.get(f"{BASE_URL}/sql/history", headers=headers)
    assert hist_res.status_code == 200, "Failed to get history"
    hist_items = hist_res.json()
    assert len(hist_items) > 0, "History should contain entries"
    latest_hist = hist_items[0]
    print(f"[HISTORY] Latest History Entry: Execution Status: {latest_hist.get('execution_status')}, Rows: {latest_hist.get('row_count')}, Time: {latest_hist.get('execution_time_ms')}ms")

    # 8. Test Documentation Generation
    doc_res = httpx.post(
        f"{BASE_URL}/sql/generate-docs",
        headers=headers,
        json={
            "sql": sql_text,
            "dialect": "POSTGRESQL",
            "prompt": "Retrieve all departments with employee counts and average salary",
            "columns": exec_data["columns"],
            "row_count": exec_data["row_count"],
            "execution_time_ms": exec_data["execution_time_ms"],
            "sample_rows": exec_data["rows"]
        }
    )
    assert doc_res.status_code == 200, f"Generate docs failed: {doc_res.status_code}"
    doc_preview = doc_res.json()
    assert len(doc_preview["content"]) > 100, "Documentation markdown should be generated"
    print(f"[DOC GEN] Synthesized Documentation Preview: '{doc_preview['title']}' ({len(doc_preview['content'])} chars)")

    # 9. Test Create New Document in Knowledge Base
    create_doc_res = httpx.post(
        f"{BASE_URL}/docs/custom",
        headers=headers,
        json={
            "title": doc_preview["title"],
            "doc_type": "TECH_DESIGN",
            "content": doc_preview["content"]
        }
    )
    assert create_doc_res.status_code == 201, "Create custom doc failed"
    saved_doc = create_doc_res.json()
    saved_doc_id = saved_doc["id"]
    print(f"[DOC SAVE] Created New Specification Document: ID {saved_doc_id}")

    # 10. Test Update Existing Document in Knowledge Base
    update_doc_res = httpx.put(
        f"{BASE_URL}/docs/{saved_doc_id}",
        headers=headers,
        json={
            "append_content": "## 7. Performance & Index Optimization Notes\n- Verified index on DEPARTMENT_ID reduces join cost."
        }
    )
    assert update_doc_res.status_code == 200, "Update document failed"
    updated_doc = update_doc_res.json()
    assert "Optimization Notes" in updated_doc["content"], "Appended section should be present"
    print(f"[DOC UPDATE] Successfully updated document with appended telemetry section.")

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL 10 SQL WRITER EXECUTE & DOCUMENTATION WORKFLOW TESTS PASSED!")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = run_sql_workflow_tests()
    sys.exit(0 if success else 1)
