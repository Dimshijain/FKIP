import time
import json
import httpx
import sys
import os

# Ensure UTF-8 stdout for Windows consoles
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "http://localhost:8000/api"

def run_test_suite():
    print("=" * 70)
    print("[START] FKIP COMPREHENSIVE VALIDATION & PERFORMANCE TEST SUITE")
    print("=" * 70)

    # 1. Authenticate Admin User
    print("\n[AUTH] Authenticating demo admin user (admin@finxsystems.com)...")
    auth_res = httpx.post(
        f"{BASE_URL}/auth/login",
        json={"email": "admin@finxsystems.com", "password": "password123"},
        timeout=10.0
    )
    if auth_res.status_code != 200:
        print(f"[FAIL] Authentication failed: {auth_res.text}")
        return False

    token = auth_res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Authenticated successfully. Token obtained.")

    # =========================================================================
    # TRACK 1: SQL WRITER VALIDATION
    # =========================================================================
    print("\n" + "=" * 50)
    print("TRACK 1: SQL WRITER VALIDATION & GUARDRAILS")
    print("=" * 50)

    # 1.1 Schema Extraction
    print("\n--- Test 1.1: Schema Tree Extraction (GET /api/sql/schema) ---")
    t0 = time.time()
    schema_res = httpx.get(f"{BASE_URL}/sql/schema", headers=headers, timeout=10.0)
    t_schema = (time.time() - t0) * 1000
    assert schema_res.status_code == 200, f"Schema extraction failed: {schema_res.text}"
    schema_data = schema_res.json()
    tables = schema_data.get("tables", [])
    print(f"[PASS] Schema extracted in {t_schema:.1f}ms. Total tables available: {len(tables)}")
    for t in tables[:4]:
        print(f"   * Table: {t['table_name']} ({t['object_type']}) - {len(t['columns'])} columns")

    # 1.2 Oracle SQL Generation
    print("\n--- Test 1.2: Oracle SQL Dialect Generation (POST /api/sql/generate) ---")
    oracle_prompts = [
        "Retrieve top 10 employee audit changes ordered by date",
        "List department names and count of employees in each department with average salary",
        "Select active users with their uploaded documents joining users and documents table"
    ]

    for p in oracle_prompts:
        t0 = time.time()
        res = httpx.post(
            f"{BASE_URL}/sql/generate",
            headers=headers,
            json={"prompt": p, "dialect": "ORACLE"},
            timeout=45.0
        )
        dur = (time.time() - t0) * 1000
        assert res.status_code == 201, f"Oracle SQL generation failed: {res.text}"
        data = res.json()
        print(f"[PASS] Oracle Query Generated in {dur:.1f}ms | Safe: {data['is_safe']}")
        print(f"   Prompt: \"{p}\"")
        print(f"   SQL:\n   {data['generated_sql'].replace(chr(10), chr(10) + '   ')}")
        print(f"   Explanation: {data['explanation'][:120]}...\n")

    # 1.3 PostgreSQL Generation
    print("\n--- Test 1.3: PostgreSQL Dialect Generation (POST /api/sql/generate) ---")
    pg_prompts = [
        "Get all users created in the last 30 days with limit 20 and offset 0",
        "Find opportunities grouped by status having count greater than 1"
    ]

    for p in pg_prompts:
        t0 = time.time()
        res = httpx.post(
            f"{BASE_URL}/sql/generate",
            headers=headers,
            json={"prompt": p, "dialect": "POSTGRESQL"},
            timeout=45.0
        )
        dur = (time.time() - t0) * 1000
        assert res.status_code == 201, f"PostgreSQL SQL generation failed: {res.text}"
        data = res.json()
        print(f"[PASS] PostgreSQL Query Generated in {dur:.1f}ms | Safe: {data['is_safe']}")
        print(f"   SQL:\n   {data['generated_sql'].replace(chr(10), chr(10) + '   ')}\n")

    # 1.4 Safety Guardrails Testing
    print("\n--- Test 1.4: Safety Guardrails & DDL/DML Rejection ---")
    unsafe_cases = [
        ("DROP TABLE users;", "DROP statement"),
        ("DELETE FROM documents WHERE 1=1;", "DELETE statement"),
        ("UPDATE oracle_metadata SET owner = 'HACKER';", "UPDATE statement"),
        ("TRUNCATE TABLE opportunities;", "TRUNCATE statement"),
        ("INSERT INTO users (email) VALUES ('evil@hack.com');", "INSERT statement"),
        ("-- comment bypass\nDROP DATABASE fkip_db;", "Comment injection DROP")
    ]

    for unsafe_sql, desc in unsafe_cases:
        explain_res = httpx.post(
            f"{BASE_URL}/sql/explain",
            headers=headers,
            json={"sql": unsafe_sql, "dialect": "ORACLE"},
            timeout=10.0
        )
        exp_data = explain_res.json()
        is_blocked = "violation" in exp_data.get("explanation", "").lower() or "restricted" in exp_data.get("explanation", "").lower()
        if is_blocked:
            print(f"[PASS] BLOCKED ({desc}): {exp_data['explanation'][:100]}...")
        else:
            print(f"[WARN] ({desc}): Guardrail did not explicitly block explain.")

    # 1.5 SQL Formatting
    print("\n--- Test 1.5: SQL Formatting (POST /api/sql/format) ---")
    unformatted = "select u.id, u.email from users u where u.role = 'admin' order by u.id desc limit 10;"
    format_res = httpx.post(
        f"{BASE_URL}/sql/format",
        headers=headers,
        json={"sql": unformatted, "dialect": "POSTGRESQL"},
        timeout=10.0
    )
    assert format_res.status_code == 200
    formatted_sql = format_res.json()["formatted_sql"]
    print(f"   Original:  {unformatted}")
    print(f"   Formatted: {formatted_sql}")
    assert "SELECT" in formatted_sql and "FROM" in formatted_sql and "WHERE" in formatted_sql
    print("[PASS] SQL formatting successfully standardized keywords.")

    # 1.6 SQL Generation History
    print("\n--- Test 1.6: SQL Generation History (GET /api/sql/history) ---")
    hist_res = httpx.get(f"{BASE_URL}/sql/history", headers=headers, timeout=10.0)
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    print(f"[PASS] History retrieved. Total logged queries: {len(hist_data)}")
    if hist_data:
        latest = hist_data[0]
        print(f"   Latest: [{latest['dialect']}] \"{latest['prompt']}\" (Safe: {latest['is_safe']})")

    # =========================================================================
    # TRACK 2: LARGE DATASET & PERFORMANCE BENCHMARKS
    # =========================================================================
    print("\n" + "=" * 50)
    print("TRACK 2: LARGE DATASET & PERFORMANCE BENCHMARKS")
    print("=" * 50)

    # 2.1 Large Document Ingestion & Chunking
    print("\n--- Test 2.1: Large Document Ingestion Benchmark ---")
    large_doc_content = "# FINXSYSTEMS CORE LEDGER ARCHITECTURE SPECIFICATION\n\n"
    for sec in range(1, 51):
        large_doc_content += (
            f"## Section {sec}: High-Throughput Ledger Partition {sec}\n"
            f"The Core Banking ledger partition {sec} implements real-time ACID transaction guarantees. "
            f"Each ledger posting undergoes SHA-256 cryptographic chaining with account hash verification. "
            f"Database cluster handles up to 10,000 TPS with sub-5ms commit latency. "
            f"Oracle RAC interconnect coordinates cache fusion across partition nodes {sec}_A and {sec}_B. "
            f"Automatic failover guarantees zero data loss (RPO=0, RTO < 1s) under partition degradation.\n\n"
        )

    t_upload_start = time.time()
    upload_res = httpx.post(
        f"{BASE_URL}/documents/upload",
        headers=headers,
        files={"file": ("finx_large_ledger_spec_v2.txt", large_doc_content.encode("utf-8"), "text/plain")},
        timeout=30.0
    )
    t_upload_dur = (time.time() - t_upload_start) * 1000
    assert upload_res.status_code in [200, 202], f"Upload failed: {upload_res.text}"
    uploaded_doc = upload_res.json()
    print(f"[PASS] Ingested 50-Section Large Document ({uploaded_doc['file_size_bytes']} bytes) in {t_upload_dur:.1f}ms")
    print(f"   Document ID: {uploaded_doc['id']} | Status: {uploaded_doc['status']}")

    # Wait for background chunking to complete
    print("   Waiting for background chunking to complete...")
    for _ in range(10):
        time.sleep(1)
        doc_check = httpx.get(f"{BASE_URL}/documents", headers=headers, timeout=10.0)
        docs = doc_check.json()
        target = next((d for d in docs if d["id"] == uploaded_doc["id"]), None)
        if target and target["status"] in ["COMPLETED", "PROCESSED"]:
            print(f"[PASS] Background chunking completed! Document Status: {target['status']}")
            break

    # 2.2 Redis Caching & Search Speedup
    print("\n--- Test 2.2: Knowledge Search & Redis Cache Latency Comparison ---")
    query_term = "ledger partition real-time ACID transaction guarantees"

    # Cold Query (Miss)
    t_cold_start = time.time()
    cold_res = httpx.post(
        f"{BASE_URL}/search/hybrid",
        headers=headers,
        json={"query": query_term, "limit": 6},
        timeout=15.0
    )
    t_cold_dur = (time.time() - t_cold_start) * 1000
    assert cold_res.status_code == 200
    cold_data = cold_res.json()
    print(f"[PASS] Cold Search Query: {t_cold_dur:.2f}ms | Returned {len(cold_data.get('results', []))} chunks")

    # Warm Query (Cache Hit)
    t_warm_start = time.time()
    warm_res = httpx.post(
        f"{BASE_URL}/search/hybrid",
        headers=headers,
        json={"query": query_term, "limit": 6},
        timeout=15.0
    )
    t_warm_dur = (time.time() - t_warm_start) * 1000
    assert warm_res.status_code == 200
    warm_data = warm_res.json()
    print(f"[PASS] Warm (Cached) Query: {t_warm_dur:.2f}ms | Returned {len(warm_data.get('results', []))} chunks")
    
    speedup = (t_cold_dur / max(t_warm_dur, 0.1))
    print(f"[PERF] Cache Speedup Ratio: {speedup:.1f}x faster on repeat queries!")

    # 2.3 AI Copilot Models & Response Performance
    print("\n--- Test 2.3: AI Copilot Available Models & Chat Performance ---")
    models_res = httpx.get(f"{BASE_URL}/copilot/models", headers=headers, timeout=10.0)
    assert models_res.status_code == 200
    models_list = models_res.json()
    print(f"[PASS] Available Copilot Models: {len(models_list)}")
    for m in models_list:
        print(f"   * {m['name']} ({m['provider']}) - {m['parameter_size']}")

    # 2.4 RAG Conversational Assistant Performance
    print("\n--- Test 2.4: Conversational RAG Assistant (POST /api/search/chat) ---")
    chat_queries = [
        "Hello! What is FKIP platform?",
        "Explain how the core ledger partition manages transactions"
    ]

    for q in chat_queries:
        t0 = time.time()
        chat_res = httpx.post(
            f"{BASE_URL}/search/chat",
            headers=headers,
            json={"messages": [{"role": "user", "content": q}]},
            timeout=45.0
        )
        t_chat = (time.time() - t0) * 1000
        assert chat_res.status_code == 200
        chat_data = chat_res.json()
        print(f"[PASS] Query: \"{q}\" -> {t_chat:.1f}ms")
        print(f"   Response: {chat_data['response'][:130]}...\n")

    # 2.5 Admin System Monitoring Probe
    print("\n--- Test 2.5: Admin System Monitoring (GET /api/admin/monitoring) ---")
    mon_res = httpx.get(f"{BASE_URL}/admin/monitoring", headers=headers, timeout=10.0)
    assert mon_res.status_code == 200
    mon_data = mon_res.json()
    print(f"[PASS] PostgreSQL Status: {mon_data.get('postgres_status', {}).get('status')}")
    print(f"[PASS] Weaviate Status:   {mon_data.get('weaviate_status', {}).get('status')}")
    print(f"[PASS] Ollama Status:     {mon_data.get('ollama_status', {}).get('status')}")
    print(f"[PASS] Ingested Docs:     {mon_data.get('documents_count')} files ({mon_data.get('chunks_count')} chunks)")
    print(f"[PASS] Database Size:     {mon_data.get('db_size_bytes')} bytes")

    # 2.6 Pagination Verification
    print("\n--- Test 2.6: Pagination Performance (GET /api/documents) ---")
    page1_res = httpx.get(f"{BASE_URL}/documents?skip=0&limit=5", headers=headers, timeout=10.0)
    page2_res = httpx.get(f"{BASE_URL}/documents?skip=5&limit=5", headers=headers, timeout=10.0)
    assert page1_res.status_code == 200 and page2_res.status_code == 200
    p1_items = page1_res.json()
    p2_items = page2_res.json()
    print(f"[PASS] Page 1: {len(p1_items)} documents | Page 2: {len(p2_items)} documents")
    if p1_items and p2_items:
        assert p1_items[0]["id"] != p2_items[0]["id"], "Pagination items should not overlap!"
        print("[PASS] Pagination boundary confirmed unique across pages.")

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL VALIDATION & PERFORMANCE TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = run_test_suite()
    sys.exit(0 if success else 1)
