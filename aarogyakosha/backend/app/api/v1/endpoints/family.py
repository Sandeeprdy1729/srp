"""
AarogyaKosha - Family Access Endpoints
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.db.database import get_db
from app.models.models import User, FamilyAccess, Patient
from app.schemas.schemas import (
    FamilyAccessCreate,
    FamilyAccessUpdate,
    FamilyAccessResponse,
)
from app.api.v1.endpoints.auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[FamilyAccessResponse])
async def list_family_access(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List family members with access to your records."""
    result = await db.execute(
        select(FamilyAccess, User)
        .join(User, FamilyAccess.member_id == User.id)
        .where(FamilyAccess.owner_id == current_user.id, FamilyAccess.is_active == True)
    )
    rows = result.all()

    return [
        FamilyAccessResponse(
            id=access.id,
            member_id=access.member_id,
            member_name=user.full_name,
            member_email=user.email,
            relationship_type=access.relationship_type,
            can_view=access.can_view,
            can_upload=access.can_upload,
            can_share=access.can_share,
            can_manage_consent=access.can_manage_consent,
            is_active=access.is_active,
            created_at=access.created_at,
        )
        for access, user in rows
    ]


@router.post(
    "/", response_model=FamilyAccessResponse, status_code=status.HTTP_201_CREATED
)
async def add_family_member(
    access_data: FamilyAccessCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Add a family member with access to your health records."""
    # Find member by email
    result = await db.execute(
        select(User).where(User.email == access_data.member_email)
    )
    member = result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=404, detail="User not found with this email")

    if member.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    # Verify patient belongs to current user
    patient_result = await db.execute(
        select(Patient).where(
            Patient.id == access_data.patient_id, Patient.user_id == current_user.id
        )
    )
    patient = patient_result.scalar_one_or_none()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Check if access already exists
    existing_result = await db.execute(
        select(FamilyAccess).where(
            FamilyAccess.owner_id == current_user.id,
            FamilyAccess.member_id == member.id,
            FamilyAccess.patient_id == access_data.patient_id,
        )
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=400, detail="Access already granted to this member"
        )

    # Create family access
    family_access = FamilyAccess(
        owner_id=current_user.id,
        member_id=member.id,
        patient_id=access_data.patient_id,
        relationship_type=access_data.relationship_type,
        can_view=access_data.can_view,
        can_upload=access_data.can_upload,
        can_share=access_data.can_share,
        can_manage_consent=access_data.can_manage_consent,
    )

    db.add(family_access)
    await db.commit()
    await db.refresh(family_access)

    return FamilyAccessResponse(
        id=family_access.id,
        member_id=member.id,
        member_name=member.full_name,
        member_email=member.email,
        relationship_type=family_access.relationship_type,
        can_view=family_access.can_view,
        can_upload=family_access.can_upload,
        can_share=family_access.can_share,
        can_manage_consent=family_access.can_manage_consent,
        is_active=family_access.is_active,
        created_at=family_access.created_at,
    )


@router.put("/{access_id}", response_model=FamilyAccessResponse)
async def update_family_access(
    access_id: UUID,
    access_data: FamilyAccessUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update family member's access permissions."""
    result = await db.execute(
        select(FamilyAccess).where(
            FamilyAccess.id == access_id, FamilyAccess.owner_id == current_user.id
        )
    )
    family_access = result.scalar_one_or_none()

    if not family_access:
        raise HTTPException(status_code=404, detail="Family access not found")

    update_data = access_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(family_access, field, value)

    await db.commit()
    await db.refresh(family_access)

    # Get member info
    member_result = await db.execute(
        select(User).where(User.id == family_access.member_id)
    )
    member = member_result.scalar_one()

    return FamilyAccessResponse(
        id=family_access.id,
        member_id=family_access.member_id,
        member_name=member.full_name,
        member_email=member.email,
        relationship_type=family_access.relationship_type,
        can_view=family_access.can_view,
        can_upload=family_access.can_upload,
        can_share=family_access.can_share,
        can_manage_consent=family_access.can_manage_consent,
        is_active=family_access.is_active,
        created_at=family_access.created_at,
    )


@router.delete("/{access_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_family_access(
    access_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Remove family member's access."""
    result = await db.execute(
        select(FamilyAccess).where(
            FamilyAccess.id == access_id, FamilyAccess.owner_id == current_user.id
        )
    )
    family_access = result.scalar_one_or_none()

    if not family_access:
        raise HTTPException(status_code=404, detail="Family access not found")

    family_access.is_active = False
    await db.commit()


@router.get("/shared-with-me")
async def get_shared_with_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get records shared with current user by family members."""
    result = await db.execute(
        select(FamilyAccess, Patient, User)
        .join(Patient, FamilyAccess.patient_id == Patient.id)
        .join(User, FamilyAccess.owner_id == User.id)
        .where(
            FamilyAccess.member_id == current_user.id, FamilyAccess.is_active == True
        )
    )
    rows = result.all()

    return [
        {
            "access_id": str(access.id),
            "owner_name": owner.full_name,
            "owner_email": owner.email,
            "relationship_type": access.relationship_type,
            "patient_id": str(access.patient_id),
            "patient_name": patient.display_name,
            "can_view": access.can_view,
            "can_upload": access.can_upload,
            "can_share": access.can_share,
            "can_manage_consent": access.can_manage_consent,
        }
        for access, patient, owner in rows
    ]
