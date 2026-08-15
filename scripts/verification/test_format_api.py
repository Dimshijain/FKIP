import sys
import httpx

BASE_URL = "http://localhost:8000/api"

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def run_format_api_tests():
    print("=" * 70)
    print("[START] TESTING SQL FORMATTER API & IDEMPOTENCY")
    print("=" * 70)

    # 1. Login
    login_res = httpx.post(
        f"{BASE_URL}/auth/login",
        json={"email": "admin@finxsystems.com", "password": "password123"},
        timeout=10.0
    )
    assert login_res.status_code == 200, "Authentication failed"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print("[AUTH] Successfully authenticated as admin.")

    # 2. Test Single-Line Poorly Formatted SQL
    unformatted_oracle = "select d.department_name, count(e.id) as total_emp, avg(e.salary) as avg_sal from departments d left join employees e on e.department_id = d.department_id where e.salary > 50000 and d.location = 'London' group by d.department_name order by avg_sal desc fetch first 10 rows only;"
    
    fmt_res = httpx.post(
        f"{BASE_URL}/sql/format",
        headers=headers,
        json={"sql": unformatted_oracle, "dialect": "ORACLE"}
    )
    assert fmt_res.status_code == 200, f"Format failed: {fmt_res.status_code}"
    formatted_oracle = fmt_res.json()["formatted_sql"]
    print("\n[TEST 1] Single-Line Oracle Query Formatted Output:\n" + formatted_oracle)
    assert "SELECT" in formatted_oracle
    assert "  d.department_name," in formatted_oracle
    assert "  LEFT JOIN employees e" in formatted_oracle
    assert "WHERE e.salary > 50000" in formatted_oracle
    assert "  AND d.location = 'London'" in formatted_oracle
    assert "FETCH FIRST 10 ROWS ONLY;" in formatted_oracle

    # 3. Test Idempotency (Formatting already formatted query)
    fmt_res2 = httpx.post(
        f"{BASE_URL}/sql/format",
        headers=headers,
        json={"sql": formatted_oracle, "dialect": "ORACLE"}
    )
    assert fmt_res2.status_code == 200
    reformatted = fmt_res2.json()["formatted_sql"]
    assert reformatted.strip() == formatted_oracle.strip(), "Formatting must be idempotent!"
    print("\n[TEST 2] Idempotency PASS: Re-formatting formatted SQL produced exact matching string.")

    # 4. Test PostgreSQL Query Formatting
    unformatted_pg = "select u.id, u.email, u.role, d.filename from users u join documents d on d.author = u.email where u.role in ('ADMIN', 'CREATOR') and u.created_at is not null order by u.created_at desc limit 25 offset 5;"
    fmt_pg_res = httpx.post(
        f"{BASE_URL}/sql/format",
        headers=headers,
        json={"sql": unformatted_pg, "dialect": "POSTGRESQL"}
    )
    assert fmt_pg_res.status_code == 200
    formatted_pg = fmt_pg_res.json()["formatted_sql"]
    print("\n[TEST 3] PostgreSQL Query Formatted Output:\n" + formatted_pg)
    assert "LIMIT 25" in formatted_pg
    assert "OFFSET 5;" in formatted_pg

    # 5. Test Complex Query with Subqueries & Aggregates
    complex_sql = "with dept_summary as (select department_id, avg(salary) as avg_sal from employees group by department_id) select d.department_name, ds.avg_sal from departments d join dept_summary ds on ds.department_id = d.department_id where ds.avg_sal > 60000 order by ds.avg_sal desc;"
    fmt_complex_res = httpx.post(
        f"{BASE_URL}/sql/format",
        headers=headers,
        json={"sql": complex_sql, "dialect": "POSTGRESQL"}
    )
    assert fmt_complex_res.status_code == 200
    formatted_complex = fmt_complex_res.json()["formatted_sql"]
    print("\n[TEST 4] CTE Query Formatted Output:\n" + formatted_complex)
    assert "WITH" in formatted_complex
    assert "SELECT" in formatted_complex

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL SQL FORMATTER API TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = run_format_api_tests()
    sys.exit(0 if success else 1)
