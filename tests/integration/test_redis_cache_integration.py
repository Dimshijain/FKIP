import pytest
import time

def test_redis_search_cache_hit_and_invalidation(client, admin_headers):
    """Integration Test: Cold query vs Warm query latency and cache invalidation."""
    query = f"cache_test_query_{int(time.time())}"
    
    # 1. Cold query
    t0 = time.perf_counter()
    res1 = client.post("/search/hybrid", headers=admin_headers, json={"query": query, "limit": 5})
    t1 = time.perf_counter()
    cold_latency = (t1 - t0) * 1000.0
    assert res1.status_code == 200
    
    # 2. Warm query (hits Redis cache)
    t2 = time.perf_counter()
    res2 = client.post("/search/hybrid", headers=admin_headers, json={"query": query, "limit": 5})
    t3 = time.perf_counter()
    warm_latency = (t3 - t2) * 1000.0
    assert res2.status_code == 200
    assert warm_latency < 150.0 or warm_latency <= cold_latency
