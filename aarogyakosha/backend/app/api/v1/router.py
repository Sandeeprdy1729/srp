"""
AarogyaKosha - API v1 Router
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    documents,
    patients,
    sharing,
    family,
    consent,
    ai,
    dashboard,
    upload,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(upload.router, prefix="/upload", tags=["Upload"])
api_router.include_router(sharing.router, prefix="/sharing", tags=["Sharing"])
api_router.include_router(family.router, prefix="/family", tags=["Family"])
api_router.include_router(consent.router, prefix="/consents", tags=["Consent"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Services"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
