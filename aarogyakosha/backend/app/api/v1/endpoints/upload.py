"""
AarogyaKosha - File Upload Endpoints
"""

import os
import uuid
import hashlib
import mimetypes
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.core.config import settings
from app.models.models import User, Document, Patient, DocumentStatus, DocumentType
from app.schemas.schemas import DocumentResponse
from app.api.v1.endpoints.auth import get_current_active_user
from app.services.nlp_service import nlp_service
from app.services.storage_service import storage_service

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp", ".doc", ".docx"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/tiff",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def get_file_extension(filename: str) -> str:
    """Get file extension from filename."""
    return os.path.splitext(filename)[1].lower()


def calculate_checksum(content: bytes) -> str:
    """Calculate SHA256 checksum of file content."""
    return hashlib.sha256(content).hexdigest()


@router.post("/", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    patient_id: Optional[uuid.UUID] = Form(None),
    document_type: str = Form("other"),
    document_date: Optional[datetime] = Form(None),
    source_hospital: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a medical document."""
    # Validate file extension
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file content type: {file.content_type}",
        )

    # Read file content
    content = await file.read()

    # Check file size
    if len(content) > settings.upload_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.max_file_size_mb}MB",
        )

    # Calculate checksum
    checksum = calculate_checksum(content)

    # Get or create default patient
    if patient_id:
        result = await db.execute(
            select(Patient).where(
                Patient.id == patient_id, Patient.user_id == current_user.id
            )
        )
        patient = result.scalar_one_or_none()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
    else:
        # Create or get default patient
        result = await db.execute(
            select(Patient).where(Patient.user_id == current_user.id)
        )
        patient = result.scalar_one_or_none()

        if not patient:
            patient = Patient(
                user_id=current_user.id,
                display_name=current_user.full_name,
                date_of_birth=current_user.date_of_birth,
                gender=current_user.gender,
            )
            db.add(patient)
            await db.commit()
            await db.refresh(patient)

    # Generate unique file path
    file_id = str(uuid.uuid4())
    file_ext = ext
    stored_filename = f"{file_id}{file_ext}"
    file_path = os.path.join(settings.upload_dir, current_user.id.hex, stored_filename)

    # Ensure directory exists
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    # Save file
    with open(file_path, "wb") as f:
        f.write(content)

    # Create document record
    document = Document(
        patient_id=patient.id,
        user_id=current_user.id,
        title=title,
        document_type=DocumentType(document_type),
        status=DocumentStatus.PENDING,
        file_name=file.filename,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type,
        checksum=checksum,
        document_date=document_date,
        source="upload",
        source_hospital=source_hospital,
    )

    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Process document asynchronously (in production, use Celery)
    try:
        await process_document_background(document.id, db)
    except Exception as e:
        print(f"Background processing error: {e}")

    return document


async def process_document_background(document_id, db: AsyncSession):
    """Background processing of uploaded document."""
    from app.services.nlp_service import nlp_service

    # Get document
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()

    if not document:
        return

    try:
        # Update status to processing
        document.status = DocumentStatus.PROCESSING
        await db.commit()

        # Read file content
        with open(document.file_path, "rb") as f:
            content = f.read()

        # Extract text based on file type
        if document.mime_type == "application/pdf":
            extracted_text = await nlp_service.extract_text_from_pdf(content)
        elif document.mime_type in (
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ):
            extracted_text = await nlp_service.extract_text_from_docx(content)
        else:
            extracted_text = await nlp_service.extract_text_from_image(content)

        document.extracted_text = extracted_text

        # Run NLP analysis
        if extracted_text:
            entities = await nlp_service.extract_entities(extracted_text)
            insights = await nlp_service.generate_insights(
                extracted_text, document.document_type.value
            )

            document.extracted_entities = entities
            document.ai_insights = insights
            document.ai_summary = insights.get("summary")

        # Update status to completed
        document.status = DocumentStatus.COMPLETED
        document.processed_at = datetime.utcnow()

        await db.commit()

    except Exception as e:
        print(f"Document processing error: {e}")
        document.status = DocumentStatus.FAILED
        await db.commit()


@router.post("/batch", response_model=list[DocumentResponse])
async def upload_documents_batch(
    files: list[UploadFile] = File(...),
    patient_id: Optional[uuid.UUID] = Form(None),
    document_type: str = Form("other"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Upload multiple documents at once."""
    results = []

    for file in files:
        try:
            doc = await upload_document(
                file=file,
                title=file.filename or "Untitled",
                patient_id=patient_id,
                document_type=document_type,
                db=db,
                current_user=current_user,
            )
            results.append(doc)
        except HTTPException as e:
            # Continue with other files if one fails
            continue

    return results
