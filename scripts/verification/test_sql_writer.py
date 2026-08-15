import httpx

def test_sql_writer_module():
    print("==========================================================")
    print("     TESTING PHASE 1: AI-POWERED SQL WRITER MODULE       ")
    print("==========================================================")

    # 1. Login
    auth_resp = httpx.post(
        'http://localhost:8000/api/auth/login',
        json={'email': 'admin@finxsystems.com', 'password': 'password123', 'role': 'ADMIN'},
        timeout=30.0
    )
    assert auth_resp.status_code == 200, f"Auth failed: {auth_resp.text}"
    token = auth_resp.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    # 2. Test GET /api/sql/schema
    print("\n1. Testing GET /api/sql/schema...")
    schema_res = httpx.get('http://localhost:8000/api/sql/schema', headers=headers, timeout=15.0)
    assert schema_res.status_code == 200, f"Schema tree failed: {schema_res.text}"
    tables = schema_res.json()['tables']
    print(f"   Schema Tree Tables Count: {len(tables)}")
    assert len(tables) > 0, "Schema tree should contain at least 1 table."
    print(f"   Sample Table: {tables[0]['table_name']} ({tables[0]['object_type']}) with {len(tables[0]['columns'])} columns.")

    # 3. Test Oracle SQL Generation
    print("\n2. Testing Oracle SQL Generation (POST /api/sql/generate)...")
    ora_res = httpx.post(
        'http://localhost:8000/api/sql/generate',
        json={'prompt': 'Write an Oracle query to get top 10 users with active role', 'dialect': 'ORACLE'},
        headers=headers,
        timeout=30.0
    )
    assert ora_res.status_code == 201, f"Oracle SQL gen failed: {ora_res.text}"
    ora_data = ora_res.json()
    print(f"   Oracle SQL Generated: \n{ora_data['generated_sql']}")
    print(f"   Safety Status: {ora_data['is_safe']} (Warning: {ora_data['safety_warning']})")
    assert ora_data['is_safe'] == True, "Generated Oracle SELECT query should be marked read-only safe."

    # 4. Test PostgreSQL Generation
    print("\n3. Testing PostgreSQL Generation (POST /api/sql/generate)...")
    pg_res = httpx.post(
        'http://localhost:8000/api/sql/generate',
        json={'prompt': 'Get all documents uploaded in past week with document chunks', 'dialect': 'POSTGRESQL'},
        headers=headers,
        timeout=30.0
    )
    assert pg_res.status_code == 201, f"PostgreSQL gen failed: {pg_res.text}"
    pg_data = pg_res.json()
    print(f"   PostgreSQL SQL Generated: \n{pg_data['generated_sql']}")
    print(f"   Safety Status: {pg_data['is_safe']}")
    assert pg_data['is_safe'] == True, "Generated PostgreSQL SELECT query should be marked read-only safe."

    # 5. Test Safety Guardrail Blocking Unsafe Statements
    print("\n4. Testing SQL Safety Guardrails (Blocking DROP/DELETE)...")
    format_unsafe_res = httpx.post(
        'http://localhost:8000/api/sql/explain',
        json={'sql': 'DROP TABLE users CASCADE;', 'dialect': 'ORACLE'},
        headers=headers,
        timeout=15.0
    )
    assert format_unsafe_res.status_code == 200, f"Explain failed: {format_unsafe_res.text}"
    print(f"   Safety Guardrail Response: {format_unsafe_res.json()['explanation']}")
    assert "safety guardrail violation" in format_unsafe_res.json()['explanation'].lower(), "Unsafe DROP query must trigger safety guardrail warning!"

    # 6. Test GET /api/sql/history
    print("\n5. Testing GET /api/sql/history...")
    hist_res = httpx.get('http://localhost:8000/api/sql/history', headers=headers, timeout=15.0)
    assert hist_res.status_code == 200, f"History failed: {hist_res.text}"
    history_items = hist_res.json()
    print(f"   History Items Count: {len(history_items)}")
    assert len(history_items) >= 2, "History should record generated queries."

    print("\n==========================================================")
    print("  PHASE 1 PASSED: AI-POWERED SQL WRITER IS FULLY FUNCTIONAL!")
    print("==========================================================")

if __name__ == "__main__":
    test_sql_writer_module()
