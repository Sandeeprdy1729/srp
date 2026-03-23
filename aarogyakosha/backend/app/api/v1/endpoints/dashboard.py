"""
AarogyaKosha - Dashboard Endpoints
"""

from uuid import UUID
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.db.database import get_db
from app.models.models import User, Document, Patient, Observation, Medication
from app.schemas.schemas import DashboardStats, HealthSummary
from app.api.v1.endpoints.auth import get_current_active_user

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get dashboard statistics for current user."""
    # Total documents
    total_result = await db.execute(
        select(func.count(Document.id)).where(
            Document.user_id == current_user.id, Document.is_deleted == False
        )
    )
    total_documents = total_result.scalar() or 0

    # Documents this month
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    month_result = await db.execute(
        select(func.count(Document.id)).where(
            Document.user_id == current_user.id,
            Document.is_deleted == False,
            Document.created_at >= month_start,
        )
    )
    documents_this_month = month_result.scalar() or 0

    # Pending documents
    pending_result = await db.execute(
        select(func.count(Document.id)).where(
            Document.user_id == current_user.id, Document.status == "pending"
        )
    )
    pending_documents = pending_result.scalar() or 0

    # Recent activities
    recent_result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.updated_at.desc())
        .limit(5)
    )
    recent_docs = recent_result.scalars().all()

    recent_activities = [
        {
            "type": "document",
            "action": "uploaded" if doc.status == "pending" else doc.status,
            "title": doc.title,
            "document_type": doc.document_type.value,
            "timestamp": doc.created_at.isoformat(),
        }
        for doc in recent_docs
    ]

    return DashboardStats(
        total_documents=total_documents,
        documents_this_month=documents_this_month,
        pending_documents=pending_documents,
        recent_activities=recent_activities,
        health_trends={},
        upcoming_reminders=[],
    )


@router.get("/health-summary", response_model=HealthSummary)
async def get_health_summary(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get comprehensive health summary."""
    # Verify patient access
    patient_result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id, Patient.user_id == current_user.id
        )
    )
    patient = patient_result.scalar_one_or_none()

    if not patient:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Patient not found")

    # Recent documents
    docs_result = await db.execute(
        select(Document)
        .where(Document.patient_id == patient_id, Document.is_deleted == False)
        .order_by(Document.created_at.desc())
        .limit(5)
    )
    recent_documents = docs_result.scalars().all()

    # Active medications
    meds_result = await db.execute(
        select(Medication).where(
            Medication.patient_id == patient_id, Medication.is_active == True
        )
    )
    medications = meds_result.scalars().all()
    active_medications = [
        {
            "name": med.medication_name,
            "dosage": med.dosage,
            "frequency": med.frequency,
            "instructions": med.instructions,
        }
        for med in medications
    ]

    # Recent labs
    labs_result = await db.execute(
        select(Observation)
        .where(Observation.patient_id == patient_id)
        .order_by(Observation.observation_date.desc())
        .limit(10)
    )
    labs = labs_result.scalars().all()
    recent_labs = [
        {
            "component": obs.component_display,
            "value": obs.value,
            "unit": obs.value_unit,
            "reference_range": obs.reference_range,
            "interpretation": obs.interpretation,
            "date": obs.observation_date.isoformat() if obs.observation_date else None,
        }
        for obs in labs
    ]

    # Risk factors from patient profile
    risk_factors = patient.medical_conditions or []

    return HealthSummary(
        recent_documents=recent_documents,
        active_medications=active_medications,
        recent_labs=recent_labs,
        risk_factors=risk_factors,
        recommendations=[],
    )


@router.get("/timeline")
async def get_health_timeline(
    patient_id: UUID,
    days: int = 365,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get health timeline with all events."""
    from datetime import datetime, timedelta

    start_date = datetime.utcnow() - timedelta(days=days)

    # Get all events
    docs_result = await db.execute(
        select(Document)
        .where(Document.patient_id == patient_id, Document.created_at >= start_date)
        .order_by(Document.document_date.desc())
    )
    documents = docs_result.scalars().all()

    labs_result = await db.execute(
        select(Observation)
        .where(
            Observation.patient_id == patient_id,
            Observation.observation_date >= start_date,
        )
        .order_by(Observation.observation_date.desc())
    )
    labs = labs_result.scalars().all()

    # Combine and sort
    events = []

    for doc in documents:
        events.append(
            {
                "type": "document",
                "id": str(doc.id),
                "title": doc.title,
                "category": doc.document_type.value,
                "date": doc.document_date or doc.created_at,
                "summary": doc.ai_summary,
            }
        )

    for lab in labs:
        events.append(
            {
                "type": "lab",
                "id": str(lab.id),
                "title": lab.component_display,
                "category": "lab_result",
                "date": lab.observation_date,
                "value": lab.value,
                "unit": lab.value_unit,
            }
        )

    # Sort by date descending
    events.sort(key=lambda x: x["date"] or datetime.min, reverse=True)

    return {"events": events, "total": len(events)}


@router.get("/emergency-qr")
async def get_emergency_qr_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get emergency QR code data for the user."""
    # Get default patient
    patient_result = await db.execute(
        select(Patient).where(Patient.user_id == current_user.id)
    )
    patient = patient_result.scalar_one_or_none()

    if not patient:
        return {
            "name": current_user.full_name,
            "blood_group": None,
            "allergies": [],
            "conditions": [],
            "medications": [],
            "emergency_contact": current_user.emergency_contact,
            "abha_number": current_user.abha_number,
        }

    # Get active medications
    meds_result = await db.execute(
        select(Medication).where(
            Medication.patient_id == patient.id, Medication.is_active == True
        )
    )
    meds = meds_result.scalars().all()

    return {
        "name": current_user.full_name,
        "date_of_birth": patient.date_of_birth.isoformat()
        if patient.date_of_birth
        else None,
        "blood_group": patient.blood_group,
        "allergies": patient.allergies or [],
        "conditions": patient.medical_conditions or [],
        "medications": [m.medication_name for m in meds],
        "emergency_contact": current_user.emergency_contact,
        "abha_number": current_user.abha_number,
    }
