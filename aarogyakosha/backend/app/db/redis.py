"""
AarogyaKosha - Redis Cache Configuration
"""

import json
from typing import Optional, Any
from datetime import timedelta

import redis.asyncio as redis

from app.core.config import settings


class RedisClient:
    """Async Redis client wrapper."""

    def __init__(self):
        self.redis: Optional[redis.Redis] = None

    async def connect(self):
        """Connect to Redis."""
        try:
            self.redis = redis.from_url(
                settings.redis_url, encoding="utf-8", decode_responses=True
            )
            await self.redis.ping()
            print("Redis connected")
        except Exception:
            print("Redis not available — running without cache")
            self.redis = None

    async def disconnect(self):
        """Disconnect from Redis."""
        if self.redis:
            await self.redis.close()

    async def get(self, key: str) -> Optional[str]:
        """Get a value."""
        return await self.redis.get(key)

    async def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """Set a value with optional expiration in seconds."""
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        if expire:
            return await self.redis.setex(key, expire, value)
        return await self.redis.set(key, value)

    async def delete(self, key: str) -> int:
        """Delete a key."""
        return await self.redis.delete(key)

    async def exists(self, key: str) -> bool:
        """Check if key exists."""
        return await self.redis.exists(key) > 0

    async def incr(self, key: str) -> int:
        """Increment a counter."""
        return await self.redis.incr(key)

    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on a key."""
        return await self.redis.expire(key, seconds)

    async def get_json(self, key: str) -> Optional[Any]:
        """Get and parse JSON value."""
        value = await self.get(key)
        if value:
            return json.loads(value)
        return None


redis_client = RedisClient()


async def get_redis() -> RedisClient:
    """Dependency for getting Redis client."""
    return redis_client
