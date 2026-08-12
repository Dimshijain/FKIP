import time
import json
import logging
from typing import Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

# Try connecting to Redis
try:
    import redis
    redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=0.5, socket_connect_timeout=0.5)
    redis_client.ping()
    HAS_REDIS = True
    logger.info(f"Connected to Redis cache instance at {settings.REDIS_URL} successfully.")
except Exception as e:
    HAS_REDIS = False
    redis_client = None
    logger.info(f"Redis cache instance not available ({str(e)}). Using thread-safe in-memory LRU cache fallback.")

# In-memory cache fallback dictionary: { key: (value_json, expire_timestamp) }
_in_memory_cache = {}

class CacheService:
    @staticmethod
    def get(key: str) -> Optional[Any]:
        if HAS_REDIS and redis_client:
            try:
                val = redis_client.get(key)
                if val is not None:
                    return json.loads(val)
            except Exception as e:
                logger.warning(f"Redis get error for key '{key}': {str(e)}")

        # Fallback to in-memory cache
        if key in _in_memory_cache:
            val, expire_at = _in_memory_cache[key]
            if time.time() < expire_at:
                return val
            else:
                del _in_memory_cache[key]
        return None

    @staticmethod
    def set(key: str, value: Any, ttl_seconds: int = 120) -> bool:
        try:
            val_json = json.dumps(value)
        except Exception:
            return False

        if HAS_REDIS and redis_client:
            try:
                redis_client.setex(key, ttl_seconds, val_json)
                return True
            except Exception as e:
                logger.warning(f"Redis set error for key '{key}': {str(e)}")

        # Fallback to in-memory cache
        _in_memory_cache[key] = (value, time.time() + ttl_seconds)
        
        # Cleanup expired entries if cache exceeds 1000 items
        if len(_in_memory_cache) > 1000:
            now = time.time()
            expired_keys = [k for k, (_, exp) in _in_memory_cache.items() if now >= exp]
            for k in expired_keys:
                del _in_memory_cache[k]
                
        return True

    @staticmethod
    def delete(key: str) -> bool:
        if HAS_REDIS and redis_client:
            try:
                redis_client.delete(key)
            except Exception:
                pass
        if key in _in_memory_cache:
            del _in_memory_cache[key]
        return True

cache_service = CacheService()
