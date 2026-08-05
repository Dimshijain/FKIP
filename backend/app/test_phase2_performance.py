import httpx
import time

def test_phase2_performance():
    print("==========================================================")
    print("      TESTING PHASE 2: PERFORMANCE & STREAMING SUITE     ")
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

    # 2. Test Pagination Across Endpoints
    print("\n1. Testing Endpoint Pagination Parameters...")
    
    doc_res = httpx.get('http://localhost:8000/api/documents?skip=0&limit=5', headers=headers, timeout=15.0)
    assert doc_res.status_code == 200, f"Documents list failed: {doc_res.text}"
    docs = doc_res.json()
    print(f"   [GET /api/documents?skip=0&limit=5] Returned {len(docs)} items.")
    assert len(docs) <= 5, "Pagination limit 5 should be respected."

    ora_res = httpx.get('http://localhost:8000/api/oracle/objects?skip=0&limit=5', headers=headers, timeout=15.0)
    assert ora_res.status_code == 200, f"Oracle objects failed: {ora_res.text}"
    ora_objs = ora_res.json()
    print(f"   [GET /api/oracle/objects?skip=0&limit=5] Returned {len(ora_objs)} items.")
    assert len(ora_objs) <= 5, "Oracle objects limit 5 should be respected."

    dna_res = httpx.get('http://localhost:8000/api/dna/apps?skip=0&limit=5', headers=headers, timeout=15.0)
    assert dna_res.status_code == 200, f"DNA apps failed: {dna_res.text}"
    dna_apps = dna_res.json()
    print(f"   [GET /api/dna/apps?skip=0&limit=5] Returned {len(dna_apps)} items.")

    # 3. Test Redis / Cache Speedup for Search
    print("\n2. Testing Redis & Hybrid Cache Speedup...")
    t0 = time.time()
    s1 = httpx.post('http://localhost:8000/api/search/hybrid', json={'query': 'database schema', 'limit': 5}, headers=headers, timeout=15.0)
    t1 = time.time() - t0
    
    t2 = time.time()
    s2 = httpx.post('http://localhost:8000/api/search/hybrid', json={'query': 'database schema', 'limit': 5}, headers=headers, timeout=15.0)
    t3 = time.time() - t2
    
    print(f"   First Search (Cache Miss): {t1*1000:.2f}ms")
    print(f"   Second Search (Cache Hit): {t3*1000:.2f}ms")
    assert s1.status_code == 200 and s2.status_code == 200, "Hybrid search failed."
    assert t3 < 0.10, "Cache hit should return under 100ms!"

    # 4. Test Copilot SSE Streaming Response Endpoint
    print("\n3. Testing Copilot SSE Token Streaming (POST /api/copilot/chat/stream)...")
    copilot_chunks = []
    with httpx.Client(timeout=30.0) as client:
        with client.stream('POST', 'http://localhost:8000/api/copilot/chat/stream', json={'message': 'Explain core banking account balance query'}, headers=headers) as response:
            assert response.status_code == 200, f"Copilot stream HTTP failed: {response.status_code}"
            for chunk in response.iter_bytes():
                if chunk:
                    copilot_chunks.append(chunk)
    
    print(f"   Received {len(copilot_chunks)} SSE copilot stream data chunks.")
    assert len(copilot_chunks) > 0, "Copilot SSE stream response should not be empty."

    # 5. Test Search SSE Streaming Response Endpoint
    print("\n4. Testing Knowledge Search SSE Token Streaming (POST /api/search/chat/stream)...")
    search_chunks = []
    with httpx.Client(timeout=30.0) as client:
        with client.stream('POST', 'http://localhost:8000/api/search/chat/stream', json={'messages': [{'role': 'user', 'content': 'What PostgreSQL tables are used?'}]}, headers=headers) as response:
            assert response.status_code == 200, f"Search stream HTTP failed: {response.status_code}"
            for chunk in response.iter_bytes():
                if chunk:
                    search_chunks.append(chunk)

    print(f"   Received {len(search_chunks)} SSE search data chunks.")
    assert len(search_chunks) > 0, "Search SSE stream response should not be empty."

    print("\n==========================================================")
    print("  PHASE 2 PASSED: PERFORMANCE & STREAMING SUITE VERIFIED! ")
    print("==========================================================")

if __name__ == "__main__":
    test_phase2_performance()
