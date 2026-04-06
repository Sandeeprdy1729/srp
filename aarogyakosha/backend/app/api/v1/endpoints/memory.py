"""
AarogyaKosha - Memory API Endpoints
"""

import base64
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.models.models import User
from app.api.v1.endpoints.auth import get_current_active_user
from app.services.memory_service import memory_service

router = APIRouter()


class MemoryStoreRequest(BaseModel):
    content: str
    content_type: str = "text"
    memory_type: str = "observation"
    metadata: Optional[dict] = None


class MemoryQueryRequest(BaseModel):
    query: str
    query_type: str = "text"
    n_results: int = 5


class ImageQueryRequest(BaseModel):
    image_base64: str
    query: str
    n_results: int = 5


@router.post("/store")
async def store_memory(
    request: MemoryStoreRequest, current_user: User = Depends(get_current_active_user)
):
    """Store a memory (text, image, or audio)."""
    try:
        memory_id = await memory_service.remember(
            content=request.content,
            content_type=request.content_type,
            user_id=str(current_user.id),
            memory_type=request.memory_type,
            metadata=request.metadata,
        )

        return {
            "status": "stored",
            "memory_id": memory_id,
            "content_type": request.content_type,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recall")
async def recall_memory(
    request: MemoryQueryRequest, current_user: User = Depends(get_current_active_user)
):
    """Recall memories similar to the query."""
    try:
        result = await memory_service.recall(
            query=request.query,
            query_type=request.query_type,
            user_id=str(current_user.id),
            n_results=request.n_results,
        )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query")
async def query_with_reasoning(
    request: MemoryQueryRequest, current_user: User = Depends(get_current_active_user)
):
    """Query with full reasoning (encode → associate → think)."""
    try:
        result = await memory_service.query_with_reasoning(
            query=request.query,
            user_id=str(current_user.id),
            n_results=request.n_results,
        )

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query-image")
async def query_with_image(
    request: ImageQueryRequest, current_user: User = Depends(get_current_active_user)
):
    """Query using an image."""
    try:
        # Decode base64 image
        image_data = base64.b64decode(request.image_base64)

        # Get similar memories
        result = await memory_service.recall(
            query=image_data,
            query_type="image",
            user_id=str(current_user.id),
            n_results=request.n_results,
        )

        # Use reasoning to analyze image in context
        reasoning = await memory_service.think(
            query=request.query, context=result["memories"]
        )

        return {
            "query": request.query,
            "similar_memories": result["memories"],
            "analysis": reasoning,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent")
async def get_recent_memories(
    limit: int = 10,
    memory_type: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
):
    """Get recent memories."""
    try:
        memories = await memory_service.store.get_recent_memories(
            limit=limit, memory_type=memory_type
        )

        # Filter by user
        user_memories = [
            m
            for m in memories
            if m.get("metadata", {}).get("user_id") == str(current_user.id)
        ]

        return {"memories": user_memories, "count": len(user_memories)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str, current_user: User = Depends(get_current_active_user)
):
    """Delete a specific memory."""
    try:
        success = await memory_service.store.delete_memory(memory_id)

        if success:
            return {"status": "deleted", "memory_id": memory_id}
        else:
            raise HTTPException(status_code=404, detail="Memory not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_memory_stats(current_user: User = Depends(get_current_active_user)):
    """Get memory system statistics."""
    try:
        stats = await memory_service.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-image")
async def upload_image_memory(
    file: UploadFile = File(...),
    query: str = Form(""),
    current_user: User = Depends(get_current_active_user),
):
    """Upload an image and store in memory with optional query."""
    try:
        # Read image bytes
        image_bytes = await file.read()

        # Encode and store
        embedding = await memory_service.encode(image_bytes, "image")

        # Store in vector store
        memory_id = await memory_service.store.add_memory(
            content=f"[Image: {file.filename}] {query}",
            embedding=embedding,
            metadata={
                "user_id": str(current_user.id),
                "content_type": "image",
                "filename": file.filename,
                "query": query,
            },
            memory_type="observation",
        )

        return {"status": "stored", "memory_id": memory_id, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
