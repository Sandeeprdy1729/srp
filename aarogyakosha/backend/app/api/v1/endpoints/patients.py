"""
AarogyaKosha - Patient Endpoints
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.models import User, Patient
from app.schemas.schemas import PatientCreate, PatientUpdate, PatientResponse
from app.api.v1.endpoints.auth import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[PatientResponse])
async def list_patients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """List all patients for current user."""
    result = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    return result.scalars().all()


@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient_data: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a new patient profile."""
    patient = Patient(
        user_id=current_user.id,
        display_name=patient_data.display_name,
        date_of_birth=patient_data.date_of_birth,
        gender=patient_data.gender,
        blood_group=patient_data.blood_group,
        allergies=patient_data.allergies,
        medical_conditions=patient_data.medical_conditions,
        current_medications=patient_data.current_medications,
    )

    db.add(patient)
    await db.commit()
    await db.refresh(patient)

    return patient


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get patient by ID."""
    result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id, Patient.user_id == current_user.id
        )
    )
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: UUID,
    patient_data: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Update patient profile."""
    result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id, Patient.user_id == current_user.id
        )
    )
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = patient_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    await db.commit()
    await db.refresh(patient)

    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_patient(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete patient profile."""
    result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id, Patient.user_id == current_user.id
        )
    )
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    await db.delete(patient)
    await db.commit()


@router.get("/{patient_id}/documents/count")
async def get_patient_document_count(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get document count for patient."""
    from app.models.models import Document
    from sqlalchemy import func

    result = await db.execute(
        select(func.count(Document.id)).where(
            Document.patient_id == patient_id, Document.user_id == current_user.id
        )
    )
    count = result.scalar()

    return {"patient_id": str(patient_id), "document_count": count}
