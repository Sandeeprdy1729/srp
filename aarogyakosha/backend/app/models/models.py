"""
AarogyaKosha - Database Models
SQLAlchemy Models for PostgreSQL
"""

import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    Column,
    String,
    DateTime,
    Boolean,
    Integer,
    Text,
    BigInteger,
    ForeignKey,
    JSON,
    Index,
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import enum

from app.db.database import Base


class UserRole(str, enum.Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    FAMILY_MEMBER = "family_member"
    ADMIN = "admin"


class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentType(str, enum.Enum):
    PRESCRIPTION = "prescription"
    LAB_REPORT = "lab_report"
    DISCHARGE_SUMMARY = "discharge_summary"
    OP_CONSULTATION = "op_consultation"
    IMMUNIZATION = "immunization"
    WELLNESS_RECORD = "wellness_record"
    HEALTH_DOCUMENT = "health_document"
    OTHER = "other"


class ConsentStatus(str, enum.Enum):
    PENDING = "pending"
    GRANTED = "granted"
    DENIED = "denied"
    EXPIRED = "expired"
    REVOKED = "revoked"


class User(Base):
    """User account model."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    gender = Column(String(20), nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.PATIENT)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    abha_number = Column(String(14), nullable=True, unique=True)
    abha_address = Column(String(50), nullable=True)
    emergency_contact = Column(JSON, nullable=True)
    preferences = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    documents = relationship("Document", back_populates="user")
    patients = relationship("Patient", back_populates="user")
    family_access_granted = relationship(
        "FamilyAccess", foreign_keys="FamilyAccess.owner_id", back_populates="owner"
    )
    family_access_received = relationship(
        "FamilyAccess", foreign_keys="FamilyAccess.member_id", back_populates="member"
    )
    sharing_links = relationship("SharingLink", back_populates="user")
    consents_given = relationship(
        "Consent", foreign_keys="Consent.patient_id", back_populates="patient"
    )
    consents_received = relationship(
        "Consent", foreign_keys="Consent.requester_id", back_populates="requester"
    )


class Patient(Base):
    """Patient profile model - links to FHIR Patient resource."""

    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    fhir_patient_id = Column(String(255), nullable=True)
    display_name = Column(String(255), nullable=False)
    date_of_birth = Column(DateTime, nullable=True)
    gender = Column(String(20), nullable=True)
    blood_group = Column(String(10), nullable=True)
    allergies = Column(ARRAY(String), default=list)
    medical_conditions = Column(ARRAY(String), default=list)
    current_medications = Column(ARRAY(String), default=list)
    extra_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="patients")
    documents = relationship("Document", back_populates="patient")
    family_access = relationship("FamilyAccess", back_populates="patient")


class Document(Base):
    """Medical document model."""

    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    title = Column(String(500), nullable=False)
    document_type = Column(SQLEnum(DocumentType), default=DocumentType.OTHER)
    status = Column(SQLEnum(DocumentStatus), default=DocumentStatus.PENDING)

    file_name = Column(String(255), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)
    checksum = Column(String(64), nullable=True)

    fhir_document_id = Column(String(255), nullable=True)
    thumbnail_path = Column(String(1000), nullable=True)

    extracted_text = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_insights = Column(JSON, nullable=True)
    extracted_entities = Column(JSON, nullable=True)

    document_date = Column(DateTime, nullable=True)
    source = Column(String(100), default="upload")
    source_hospital = Column(String(255), nullable=True)

    is_emergency = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="documents")
    user = relationship("User", back_populates="documents")
    sharing_links = relationship("SharingLink", back_populates="document")

    __table_args__ = (
        Index("idx_document_patient", "patient_id"),
        Index("idx_document_user", "user_id"),
        Index("idx_document_status", "status"),
        Index("idx_document_type", "document_type"),
        Index("idx_document_created", "created_at"),
    )


class SharingLink(Base):
    """Temporary document sharing link model."""

    __tablename__ = "sharing_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)

    token = Column(String(255), unique=True, index=True, nullable=False)
    purpose = Column(String(255), nullable=True)

    expires_at = Column(DateTime, nullable=True)
    access_count = Column(Integer, default=0)
    last_accessed_at = Column(DateTime, nullable=True)

    is_revoked = Column(Boolean, default=False)
    allowed_ips = Column(ARRAY(String), default=list)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sharing_links")
    document = relationship("Document", back_populates="sharing_links")


class FamilyAccess(Base):
    """Family member access permissions."""

    __tablename__ = "family_access"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)

    can_view = Column(Boolean, default=True)
    can_upload = Column(Boolean, default=False)
    can_share = Column(Boolean, default=False)
    can_manage_consent = Column(Boolean, default=False)

    relationship_type = Column(String(50), nullable=True)

    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship(
        "User", foreign_keys=[owner_id], back_populates="family_access_granted"
    )
    member = relationship(
        "User", foreign_keys=[member_id], back_populates="family_access_received"
    )
    patient = relationship("Patient", back_populates="family_access")


class Consent(Base):
    """Patient consent management."""

    __tablename__ = "consents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consent_id = Column(String(255), unique=True, index=True, nullable=False)

    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    requester_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    purpose = Column(String(100), nullable=False)
    hi_types = Column(ARRAY(String), default=list)
    status = Column(SQLEnum(ConsentStatus), default=ConsentStatus.PENDING)

    from_date = Column(DateTime, nullable=True)
    to_date = Column(DateTime, nullable=True)

    access_count = Column(Integer, default=0)
    last_accessed_at = Column(DateTime, nullable=True)

    extra_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship(
        "User", foreign_keys=[patient_id], back_populates="consents_given"
    )
    requester = relationship(
        "User", foreign_keys=[requester_id], back_populates="consents_received"
    )


class AuditLog(Base):
    """Audit log for PHI access tracking."""

    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(255), nullable=True)

    details = Column(JSON, default=dict)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)

    timestamp = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_audit_user", "user_id"),
        Index("idx_audit_timestamp", "timestamp"),
        Index("idx_audit_action", "action"),
    )


class Observation(Base):
    """Extracted lab observations from documents."""

    __tablename__ = "observations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)

    fhir_observation_id = Column(String(255), nullable=True)

    component_code = Column(String(50), nullable=False)
    component_display = Column(String(255), nullable=True)
    value = Column(String(100), nullable=True)
    value_unit = Column(String(50), nullable=True)
    reference_range = Column(String(100), nullable=True)

    interpretation = Column(String(50), nullable=True)
    status = Column(String(50), default="final")

    observation_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_observation_patient", "patient_id"),
        Index("idx_observation_document", "document_id"),
        Index("idx_observation_date", "observation_date"),
    )


class Medication(Base):
    """Extracted medications from documents."""

    __tablename__ = "medications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)

    fhir_medication_id = Column(String(255), nullable=True)

    medication_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=True)
    frequency = Column(String(100), nullable=True)
    route = Column(String(50), nullable=True)
    duration = Column(String(100), nullable=True)
    instructions = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
