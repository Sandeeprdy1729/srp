"""
AarogyaKosha - Sharing Endpoints
"""

import secrets
from datetime import datetime, timedelta
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.models import User, Document, SharingLink
from app.schemas.schemas import SharingLinkCreate, SharingLinkResponse
from app.api.v1.endpoints.auth import get_current_active_user

router = APIRouter()


@router.post("/", response_model=SharingLinkResponse)
async def create_sharing_link(
    sharing_data: SharingLinkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a temporary sharing link for a document."""
    # Verify document ownership
    result = await db.execute(
        select(Document).where(
            Document.id == sharing_data.document_id, Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Generate secure token
    token = secrets.token_urlsafe(32)

    # Calculate expiration
    expires_at = None
    if sharing_data.expires_in_hours:
        expires_at = datetime.utcnow() + timedelta(hours=sharing_data.expires_in_hours)

    # Create sharing link
    sharing_link = SharingLink(
        user_id=current_user.id,
        document_id=sharing_data.document_id,
        token=token,
        purpose=sharing_data.purpose,
        expires_at=expires_at,
    )

    db.add(sharing_link)
    await db.commit()
    await db.refresh(sharing_link)

    return SharingLinkResponse(
        id=sharing_link.id,
        token=sharing_link.token,
        share_url=f"/share/{sharing_link.token}",
        purpose=sharing_link.purpose,
        expires_at=sharing_link.expires_at,
        access_count=sharing_link.access_count,
        created_at=sharing_link.created_at,
    )


@router.get("/", response_model=List[SharingLinkResponse])
async def list_sharing_links(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all sharing links created by current user."""
    result = await db.execute(
        select(SharingLink).where(SharingLink.user_id == current_user.id)
    )
    links = result.scalars().all()

    return [
        SharingLinkResponse(
            id=link.id,
            token=link.token,
            share_url=f"/share/{link.token}",
            purpose=link.purpose,
            expires_at=link.expires_at,
            access_count=link.access_count,
            created_at=link.created_at,
        )
        for link in links
    ]


@router.get("/{token}")
async def get_shared_document(token: str, db: AsyncSession = Depends(get_db)):
    """Access a shared document using token (public endpoint)."""
    result = await db.execute(select(SharingLink).where(SharingLink.token == token))
    sharing_link = result.scalar_one_or_none()

    if not sharing_link:
        raise HTTPException(status_code=404, detail="Sharing link not found")

    if sharing_link.is_revoked:
        raise HTTPException(
            status_code=410, detail="This sharing link has been revoked"
        )

    if sharing_link.expires_at and sharing_link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="This sharing link has expired")

    # Increment access count
    sharing_link.access_count += 1
    sharing_link.last_accessed_at = datetime.utcnow()
    await db.commit()

    # Get document
    doc_result = await db.execute(
        select(Document).where(Document.id == sharing_link.document_id)
    )
    document = doc_result.scalar_one_or_none()

    return {
        "document_id": str(document.id),
        "title": document.title,
        "document_type": document.document_type.value,
        "file_name": document.file_name,
        "mime_type": document.mime_type,
        "ai_summary": document.ai_summary,
        "document_date": document.document_date,
        "access_count": sharing_link.access_count,
    }


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_sharing_link(
    link_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Revoke a sharing link."""
    result = await db.execute(
        select(SharingLink).where(
            SharingLink.id == link_id, SharingLink.user_id == current_user.id
        )
    )
    sharing_link = result.scalar_one_or_none()

    if not sharing_link:
        raise HTTPException(status_code=404, detail="Sharing link not found")

    sharing_link.is_revoked = True
    await db.commit()
