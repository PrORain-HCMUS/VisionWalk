# redis_config.py
from redis import asyncio as aioredis
from typing import Optional
from fastapi import Depends

class RedisConfig:
    def __init__(self):
        self.redis_url = "redis://localhost:6379"
        self._redis_client: Optional[aioredis.Redis] = None

    async def init_redis_pool(self):
        """Initialize Redis connection pool"""
        try:
            if not self._redis_client:
                self._redis_client = await aioredis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_timeout=5,  # Thêm timeout
                    socket_connect_timeout=5
                )
                # Verify connection
                await self._redis_client.ping()
                print("[DEBUG] Redis connection successful")
            return self._redis_client
        except Exception as e:
            print(f"[ERROR] Redis connection failed: {str(e)}")
            raise


    async def get_redis(self) -> aioredis.Redis:
        """Get Redis client instance"""
        if not self._redis_client:
            await self.init_redis_pool()
        try:
            # Verify connection is still alive
            await self._redis_client.ping()
            return self._redis_client
        except Exception as e:
            print(f"[ERROR] Redis connection check failed: {str(e)}")
            # Reset client and try to reconnect
            self._redis_client = None
            return await self.init_redis_pool()

    async def close(self):
        """Close Redis connection"""
        if self._redis_client:
            await self._redis_client.close()
            self._redis_client = None

redis_config = RedisConfig()

# Dependency for getting Redis client
async def get_redis() -> aioredis.Redis:
    return await redis_config.get_redis()