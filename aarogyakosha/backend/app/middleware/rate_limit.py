"""
AarogyaKosha - Rate Limiting Middleware
Protects API endpoints from abuse
"""

import time
from collections import defaultdict
from typing import Dict

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send


class RateLimitMiddleware:
    """
    Simple in-memory rate limiter (pure ASGI).
    In production, use Redis-based rate limiting.
    """

    def __init__(self, app: ASGIApp, requests_per_minute: int = 60):
        self.app = app
        self.requests_per_minute = requests_per_minute
        self.window = 60  # seconds
        self._hits: Dict[str, list] = defaultdict(list)

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope)

        # Skip rate limiting for health checks
        if request.url.path in {"/health", "/ready"}:
            await self.app(scope, receive, send)
            return

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Clean old entries
        self._hits[client_ip] = [
            t for t in self._hits[client_ip] if now - t < self.window
        ]

        if len(self._hits[client_ip]) >= self.requests_per_minute:
            response = JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."},
                headers={"Retry-After": str(self.window)},
            )
            await response(scope, receive, send)
            return

        self._hits[client_ip].append(now)

        # Wrap send to inject rate limit headers
        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-ratelimit-limit", str(self.requests_per_minute).encode()))
                headers.append((b"x-ratelimit-remaining", str(
                    self.requests_per_minute - len(self._hits[client_ip])
                ).encode()))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)
