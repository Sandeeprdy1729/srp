"""
AarogyaKosha - Main Application Entry Point
FastAPI Backend with Open Source Stack
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.database import init_db
from app.db.redis import redis_client
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"Starting {settings.app_name} v{settings.app_version}")

    # Initialize database
    await init_db()

    # Connect to Redis
    await redis_client.connect()

    # Ensure upload directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)

    yield

    # Shutdown
    print(f"Shutting down {settings.app_name}")
    await redis_client.disconnect()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Open Source AI-Powered Personal Health Record System",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": settings.app_version,
        "service": settings.app_name,
    }


# Readiness check
@app.get("/ready")
async def readiness_check():
    try:
        # Check database connection
        from app.db.database import engine

        async with engine.connect() as conn:
            await conn.execute("SELECT 1")

        # Check Redis
        await redis_client.ping()

        return {"status": "ready"}
    except Exception as e:
        return JSONResponse(
            status_code=503, content={"status": "not ready", "error": str(e)}
        )


# Mount static files for uploads
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Include API routes
app.include_router(api_router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app", host=settings.host, port=settings.port, reload=settings.debug
    )
