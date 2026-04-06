"""
AarogyaKosha - Audit Logging Middleware
Tracks all API access for compliance and security (pure ASGI)
"""

import time
import uuid
from datetime import datetime

from starlette.requests import Request
from starlette.types import ASGIApp, Receive, Scope, Send

from app.db.database import AsyncSessionLocal
from app.models.models import AuditLog


class AuditMiddleware:
    """Logs all API requests to the audit_logs table (pure ASGI)."""

    SKIP_PATHS = {"/health", "/ready", "/docs", "/redoc", "/openapi.json"}

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        path = request.url.path

        if path in self.SKIP_PATHS or path.startswith("/uploads"):
            await self.app(scope, receive, send)
            return

        start_time = time.time()
        status_code = 500

        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        await self.app(scope, receive, send_wrapper)

        duration_ms = int((time.time() - start_time) * 1000)

        user_id = None
        if hasattr(request.state, "user_id"):
            user_id = request.state.user_id

        try:
            async with AsyncSessionLocal() as session:
                audit = AuditLog(
                    id=uuid.uuid4(),
                    user_id=user_id,
                    action=f"{request.method} {path}",
                    resource_type=self._extract_resource(path),
                    resource_id=self._extract_id(path),
                    details={
                        "method": request.method,
                        "path": path,
                        "status_code": status_code,
                        "duration_ms": duration_ms,
                        "query": str(request.query_params) if request.query_params else None,
                    },
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent", "")[:500],
                    timestamp=datetime.utcnow(),
                )
                session.add(audit)
                await session.commit()
        except Exception:
            pass

    @staticmethod
    def _extract_resource(path: str) -> str:
        parts = path.strip("/").split("/")
        if len(parts) >= 3:
            return parts[2]
        return parts[-1] if parts else "unknown"

    @staticmethod
    def _extract_id(path: str) -> str | None:
        parts = path.strip("/").split("/")
        if len(parts) >= 4:
            candidate = parts[3]
            if len(candidate) >= 32:
                return candidate
        return None
