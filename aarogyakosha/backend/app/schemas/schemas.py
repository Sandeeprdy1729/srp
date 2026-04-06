"""
AarogyaKosha - Pydantic Schemas
Request/Response Models
"""

from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ============ User Schemas ============


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    abha_number: Optional[str] = None
    abha_address: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    emergency_contact: Optional[dict] = None
    preferences: Optional[dict] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: str
    is_active: bool
    is_verified: bool
    abha_number: Optional[str] = None
    abha_address: Optional[str] = None
    preferences: Optional[dict] = None
    created_at: datetime
    last_login: Optional[datetime] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None


# ============ Patient Schemas ============


class PatientBase(BaseModel):
    display_name: str
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: List[str] = []
    medical_conditions: List[str] = []
    current_medications: List[str] = []


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    display_name: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[List[str]] = None
    medical_conditions: Optional[List[str]] = None
    current_medications: Optional[List[str]] = None


class PatientResponse(PatientBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    fhir_patient_id: Optional[str] = None
    created_at: datetime


# ============ Document Schemas ============


class DocumentBase(BaseModel):
    title: str
    document_type: str = "other"
    document_date: Optional[datetime] = None
    source_hospital: Optional[str] = None


class DocumentCreate(DocumentBase):
    patient_id: UUID


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    document_type: Optional[str] = None
    is_emergency: Optional[bool] = None


class ExtractedEntities(BaseModel):
    """Extracted clinical entities from NLP."""

    medications: List[dict] = []
    diagnoses: List[dict] = []
    procedures: List[dict] = []
    lab_results: List[dict] = []
    vitals: List[dict] = []
    dates: List[dict] = []
    negated_mentions: List[dict] = []


class AIInsights(BaseModel):
    """AI-generated insights from document."""

    summary: Optional[str] = None
    key_findings: List[str] = []
    document_type: str
    confidence: float = 0.0
    language: str = "en"
    translated_summary: Optional[str] = None
    action_items: List[str] = []
    warnings: List[str] = []


class DocumentResponse(DocumentBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    user_id: UUID
    status: str
    file_name: str
    file_size: int
    mime_type: str
    extracted_text: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_insights: Optional[AIInsights] = None
    extracted_entities: Optional[ExtractedEntities] = None
    fhir_document_id: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None


class DocumentListResponse(BaseModel):
    """Paginated document list."""

    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int
    pages: int


# ============ Sharing Schemas ============


class SharingLinkCreate(BaseModel):
    document_id: UUID
    purpose: Optional[str] = None
    expires_in_hours: int = Field(default=24, ge=1, le=720)


class SharingLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    token: str
    share_url: str
    purpose: Optional[str] = None
    expires_at: Optional[datetime] = None
    access_count: int
    created_at: datetime


class SharingLinkVerify(BaseModel):
    token: str


# ============ Family Access Schemas ============


class FamilyAccessCreate(BaseModel):
    member_email: EmailStr
    patient_id: UUID
    relationship_type: Optional[str] = None
    can_view: bool = True
    can_upload: bool = False
    can_share: bool = False
    can_manage_consent: bool = False
    expires_in_days: Optional[int] = None


class FamilyAccessUpdate(BaseModel):
    can_view: Optional[bool] = None
    can_upload: Optional[bool] = None
    can_share: Optional[bool] = None
    can_manage_consent: Optional[bool] = None


class FamilyAccessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    member_id: UUID
    member_name: str
    member_email: str
    relationship_type: Optional[str] = None
    can_view: bool
    can_upload: bool
    can_share: bool
    can_manage_consent: bool
    is_active: bool
    created_at: datetime


# ============ Consent Schemas ============


class ConsentCreate(BaseModel):
    purpose: str
    hi_types: List[str] = ["HealthDocument"]
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None


class ConsentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    consent_id: str
    purpose: str
    hi_types: List[str]
    status: str
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    access_count: int
    created_at: datetime


# ============ AI Schemas ============


class TranslateRequest(BaseModel):
    text: str
    target_language: str = "hi"
    context: Optional[dict] = None


class TranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    target_language: str
    action_items: List[str] = []


class CorrelationRequest(BaseModel):
    patient_id: UUID
    time_range_days: int = 365


class CorrelationFinding(BaseModel):
    type: str
    description: str
    confidence: float
    related_records: List[str] = []
    clinical_significance: str
    recommendation: Optional[str] = None


class CorrelationResponse(BaseModel):
    findings: List[CorrelationFinding]
    summary: dict


class CareRecommendation(BaseModel):
    category: str
    title: str
    description: str
    priority: str
    evidence: List[str] = []


# ============ Dashboard Schemas ============


class DashboardStats(BaseModel):
    total_documents: int
    documents_this_month: int
    pending_documents: int
    recent_activities: List[dict] = []
    health_trends: dict = {}
    upcoming_reminders: List[dict] = []


class HealthSummary(BaseModel):
    """Aggregated health summary."""

    recent_documents: List[DocumentResponse] = []
    active_medications: List[dict] = []
    recent_labs: List[dict] = []
    risk_factors: List[str] = []
    recommendations: List[CareRecommendation] = []
