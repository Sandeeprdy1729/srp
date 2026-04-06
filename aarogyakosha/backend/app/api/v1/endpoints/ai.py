"""
AarogyaKosha - AI Services Endpoints
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.models import User, Document
from app.schemas.schemas import (
    TranslateRequest,
    TranslateResponse,
    CorrelationRequest,
    CorrelationResponse,
    CorrelationFinding,
    CareRecommendation,
)
from app.api.v1.endpoints.auth import get_current_active_user
from app.services.nlp_service import nlp_service
from app.services.correlation_service import correlation_service
from app.services.translation_service import translation_service, SUPPORTED_LANGUAGES

router = APIRouter()


@router.get("/languages")
async def get_supported_languages():
    """Get list of supported translation languages."""
    return {"languages": SUPPORTED_LANGUAGES}


@router.post("/translate", response_model=TranslateResponse)
async def translate_clinical_text(
    request: TranslateRequest, current_user: User = Depends(get_current_active_user)
):
    """Translate clinical text to any supported language."""
    try:
        # Use deep-translator for actual translation
        translated_text = await translation_service.translate(
            text=request.text,
            target_language=request.target_language,
        )

        # Also get plain language explanation if translating to English
        action_items = []
        if request.target_language != "en":
            # Generate action items in target language
            entities = await nlp_service.extract_entities(request.text)
            action_items = nlp_service._generate_action_items("general", entities)

        return TranslateResponse(
            original_text=request.text,
            translated_text=translated_text,
            target_language=request.target_language,
            action_items=action_items,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


@router.post("/analyze")
async def analyze_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Re-analyze a document with AI."""
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.user_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if not document.extracted_text:
        raise HTTPException(status_code=400, detail="Document has no extracted text")

    try:
        entities = await nlp_service.extract_entities(document.extracted_text)
        insights = await nlp_service.generate_insights(
            document.extracted_text, document.document_type.value
        )

        # Update document
        document.extracted_entities = entities
        document.ai_insights = insights
        document.ai_summary = insights.get("summary")
        await db.commit()

        return {
            "entities": entities,
            "insights": insights,
            "summary": insights.get("summary"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/correlate", response_model=CorrelationResponse)
async def find_correlations(
    request: CorrelationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Find correlations across patient's health records."""
    try:
        findings = await correlation_service.analyze_patient_records(
            patient_id=request.patient_id,
            user_id=str(current_user.id),
            db=db,
            time_range_days=request.time_range_days,
        )

        return CorrelationResponse(
            findings=[CorrelationFinding(**f) for f in findings],
            summary={
                "total_findings": len(findings),
                "critical": len(
                    [
                        f
                        for f in findings
                        if f.get("clinical_significance") == "REQUIRES_ATTENTION"
                    ]
                ),
                "monitoring": len(
                    [f for f in findings if f.get("clinical_significance") == "MONITOR"]
                ),
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Correlation analysis failed: {str(e)}"
        )


@router.get("/recommendations")
async def get_care_recommendations(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get personalized care recommendations based on health data."""
    try:
        recommendations = await correlation_service.generate_recommendations(
            patient_id=patient_id, user_id=str(current_user.id), db=db
        )

        return {"recommendations": recommendations}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate recommendations: {str(e)}"
        )


@router.post("/extract-entities")
async def extract_entities_from_text(
    text: str, current_user: User = Depends(get_current_active_user)
):
    """Extract clinical entities from raw text."""
    try:
        entities = await nlp_service.extract_entities(text)
        return {"entities": entities}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Entity extraction failed: {str(e)}"
        )


@router.get("/health-summary/{patient_id}")
async def get_health_summary(
    patient_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get aggregated health summary for a patient."""
    from app.models.models import Document, Medication, Observation
    from sqlalchemy import select, and_, func

    # Get recent documents
    docs_result = await db.execute(
        select(Document)
        .where(
            Document.patient_id == patient_id,
            Document.user_id == current_user.id,
            Document.is_deleted == False,
        )
        .order_by(Document.created_at.desc())
        .limit(10)
    )
    recent_docs = docs_result.scalars().all()

    # Get active medications
    meds_result = await db.execute(
        select(Medication).where(
            Medication.patient_id == patient_id, Medication.is_active == True
        )
    )
    medications = meds_result.scalars().all()

    # Get recent lab results
    labs_result = await db.execute(
        select(Observation)
        .where(Observation.patient_id == patient_id)
        .order_by(Observation.observation_date.desc())
        .limit(20)
    )
    labs = labs_result.scalars().all()

    # Generate summary
    summary = await correlation_service.generate_health_summary(
        recent_documents=recent_docs, medications=medications, lab_results=labs
    )

    return summary
