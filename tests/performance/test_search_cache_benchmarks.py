import pytest
import time

def test_perf_search_cache_benchmark(client, admin_headers):
    """Performance: Benchmark Search API cache speedup."""
    query = "FinXSystems Settlement Engine"
    
    # 1. Warm-up search query
    res1 = client.post("/search/hybrid", headers=admin_headers, json={"query": query, "limit": 5})
    assert res1.status_code == 200
    
    # 2. Benchmark 5 subsequent cached search queries
    latencies = []
    for _ in range(5):
        t0 = time.perf_counter()
        res = client.post("/search/hybrid", headers=admin_headers, json={"query": query, "limit": 5})
        t1 = time.perf_counter()
        assert res.status_code == 200
        latencies.append((t1 - t0) * 1000.0)
    
    avg_cached_latency = sum(latencies) / len(latencies)
    assert avg_cached_latency < 150.0, f"Average cached search latency exceeded 150ms: {avg_cached_latency}ms"
