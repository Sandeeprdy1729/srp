"""
AarogyaKosha - Document Endpoints
"""

from typing import List, Optional
from uuid import UUID
import json

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.models import User, Document, Patient, DocumentStatus
from app.schemas.schemas import (
    DocumentResponse,
    DocumentUpdate,
    DocumentListResponse,
    AIInsights,
)
from app.api.v1.endpoints.auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    document_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    patient_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List user's documents with pagination and filtering."""
    query = select(Document).where(
        Document.user_id == current_user.id, Document.is_deleted == False
    )

    if patient_id:
        query = query.where(Document.patient_id == patient_id)

    if document_type:
        query = query.where(Document.document_type == document_type)

    if status:
        query = query.where(Document.status == status)

    if search:
        query = query.where(Document.title.ilike(f"%{search}%"))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Get paginated results
    query = query.order_by(Document.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    documents = result.scalars().all()

    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in documents],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get document by ID."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return document


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: UUID,
    document_data: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update document metadata."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    update_data = document_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(document, field, value)

    await db.commit()
    await db.refresh(document)

    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Soft delete document."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.is_deleted = True
    await db.commit()


@router.get("/{document_id}/text")
async def get_document_text(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get extracted text from document."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return {"text": document.extracted_text}


@router.get("/{document_id}/insights")
async def get_document_insights(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get AI insights from document."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.ai_insights:
        return document.ai_insights

    return {"message": "No insights available yet"}


@router.get("/types/list")
async def list_document_types():
    """Get list of available document types."""
    return {
        "types": [
            {"value": "prescription", "label": "Prescription"},
            {"value": "lab_report", "label": "Lab Report"},
            {"value": "discharge_summary", "label": "Discharge Summary"},
            {"value": "op_consultation", "label": "OP Consultation"},
            {"value": "immunization", "label": "Immunization Record"},
            {"value": "wellness_record", "label": "Wellness Record"},
            {"value": "health_document", "label": "Health Document"},
            {"value": "other", "label": "Other"},
        ]
    }
