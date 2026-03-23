"""
AarogyaKosha - Consent Endpoints
"""

import secrets
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.models import User, Consent, ConsentStatus
from app.schemas.schemas import ConsentCreate, ConsentResponse
from app.api.v1.endpoints.auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[ConsentResponse])
async def list_consents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all consents given by current user."""
    result = await db.execute(
        select(Consent).where(Consent.patient_id == current_user.id)
    )
    consents = result.scalars().all()

    return [ConsentResponse.model_validate(c) for c in consents]


@router.post("/", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
async def create_consent(
    consent_data: ConsentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new consent for data sharing."""
    consent_id = f"CONS-{secrets.token_hex(8).upper()}"

    consent = Consent(
        consent_id=consent_id,
        patient_id=current_user.id,
        purpose=consent_data.purpose,
        hi_types=consent_data.hi_types,
        from_date=consent_data.from_date,
        to_date=consent_data.to_date,
        status=ConsentStatus.PENDING,
    )

    db.add(consent)
    await db.commit()
    await db.refresh(consent)

    return consent


@router.get("/{consent_id}", response_model=ConsentResponse)
async def get_consent(
    consent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get consent by ID."""
    result = await db.execute(
        select(Consent).where(
            Consent.consent_id == consent_id, Consent.patient_id == current_user.id
        )
    )
    consent = result.scalar_one_or_none()

    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")

    return consent


@router.put("/{consent_id}/grant", response_model=ConsentResponse)
async def grant_consent(
    consent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Grant a pending consent."""
    result = await db.execute(
        select(Consent).where(
            Consent.consent_id == consent_id, Consent.patient_id == current_user.id
        )
    )
    consent = result.scalar_one_or_none()

    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")

    if consent.status != ConsentStatus.PENDING:
        raise HTTPException(status_code=400, detail="Consent is not pending")

    consent.status = ConsentStatus.GRANTED
    await db.commit()
    await db.refresh(consent)

    return consent


@router.put("/{consent_id}/deny", response_model=ConsentResponse)
async def deny_consent(
    consent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Deny a pending consent."""
    result = await db.execute(
        select(Consent).where(
            Consent.consent_id == consent_id, Consent.patient_id == current_user.id
        )
    )
    consent = result.scalar_one_or_none()

    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")

    if consent.status != ConsentStatus.PENDING:
        raise HTTPException(status_code=400, detail="Consent is not pending")

    consent.status = ConsentStatus.DENIED
    await db.commit()
    await db.refresh(consent)

    return consent


@router.put("/{consent_id}/revoke", response_model=ConsentResponse)
async def revoke_consent(
    consent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Revoke a granted consent."""
    result = await db.execute(
        select(Consent).where(
            Consent.consent_id == consent_id, Consent.patient_id == current_user.id
        )
    )
    consent = result.scalar_one_or_none()

    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")

    if consent.status not in [ConsentStatus.GRANTED, ConsentStatus.PENDING]:
        raise HTTPException(status_code=400, detail="Cannot revoke this consent")

    consent.status = ConsentStatus.REVOKED
    await db.commit()
    await db.refresh(consent)

    return consent


@router.delete("/{consent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_consent(
    consent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete a consent record."""
    result = await db.execute(
        select(Consent).where(
            Consent.consent_id == consent_id, Consent.patient_id == current_user.id
        )
    )
    consent = result.scalar_one_or_none()

    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")

    await db.delete(consent)
    await db.commit()
