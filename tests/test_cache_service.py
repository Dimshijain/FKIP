import os
import sys
import time
import pytest

# Ensure backend package is importable
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.services import cache


@pytest.fixture(autouse=True)
def clear_cache_state():
    # Force in-memory fallback and clear existing cache state
    cache.HAS_REDIS = False
    cache.redis_client = None
    cache._in_memory_cache.clear()
    yield
    cache._in_memory_cache.clear()


def test_set_get_delete_basic():
    key = "test:key:basic"
    value = {"x": 1, "y": "two"}

    assert cache.cache_service.set(key, value) is True
    assert cache.cache_service.get(key) == value

    assert cache.cache_service.delete(key) is True
    assert cache.cache_service.get(key) is None


def test_set_non_serializable_value_fails():
    key = "test:key:nonserial"
    # Sets are not JSON serializable by default
    value = set([1, 2, 3])

    # Operation should return False and not store the value
    assert cache.cache_service.set(key, value) is False
    assert cache.cache_service.get(key) is None


def test_ttl_expiry_behavior():
    key = "test:key:ttl"
    value = "temporary"

    assert cache.cache_service.set(key, value, ttl_seconds=1) is True
    assert cache.cache_service.get(key) == value

    # Wait for expiry
    time.sleep(1.1)
    assert cache.cache_service.get(key) is None


def test_cleanup_expired_entries_when_limit_exceeded():
    # Pre-fill the in-memory cache with >1000 items, most already expired
    now = time.time()
    for i in range(1005):
        # Make half expired, half valid
        if i % 2 == 0:
            expire_at = now - 10  # expired
        else:
            expire_at = now + 300  # valid
        cache._in_memory_cache[f"k{i}"] = (f"v{i}", expire_at)

    before_len = len(cache._in_memory_cache)
    assert before_len > 1000

    # Trigger set which should run cleanup
    assert cache.cache_service.set("trigger:key", "val", ttl_seconds=60) is True

    after_len = len(cache._in_memory_cache)
    # After cleanup, expired entries should be removed, so length must be less than before
    assert after_len < before_len
    # Newly set key should exist
    assert cache.cache_service.get("trigger:key") == "val"
