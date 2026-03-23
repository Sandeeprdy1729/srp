"""
AarogyaKosha - Correlation Service
Health Data Correlation and Trend Analysis
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


class CorrelationService:
    """
    Analyzes health records to find patterns and correlations.
    Helps identify trends, risk factors, and care recommendations.
    """

    def __init__(self):
        self.correlation_rules = {
            ("statin", "cholesterol"): self._analyze_statins_cholesterol,
            ("metformin", "glucose"): self._analyze_metformin_glucose,
            ("metformin", "hba1c"): self._analyze_metformin_hba1c,
            ("thyroid", "tsh"): self._analyze_thyroid_medication,
            ("bp", "hypertension"): self._analyze_bp_trends,
        }

    async def analyze_patient_records(
        self,
        patient_id: UUID,
        user_id: str,
        db: AsyncSession,
        time_range_days: int = 365,
    ) -> List[Dict[str, Any]]:
        """Analyze all patient records to find correlations."""

        from app.models.models import Document, Observation, Medication, Patient

        findings = []

        # Get start date
        start_date = datetime.utcnow() - timedelta(days=time_range_days)

        # Get observations (lab results)
        obs_result = await db.execute(
            select(Observation)
            .where(
                Observation.patient_id == patient_id,
                Observation.observation_date >= start_date,
            )
            .order_by(Observation.observation_date)
        )
        observations = obs_result.scalars().all()

        # Get medications
        meds_result = await db.execute(
            select(Medication).where(Medication.patient_id == patient_id)
        )
        medications = meds_result.scalars().all()

        # Get documents with AI insights
        docs_result = await db.execute(
            select(Document).where(
                Document.patient_id == patient_id, Document.created_at >= start_date
            )
        )
        documents = docs_result.scalars().all()

        # Analyze medication-lab correlations
        med_lab_correlations = await self._analyze_med_lab_correlations(
            medications, observations
        )
        findings.extend(med_lab_correlations)

        # Analyze trends
        trend_findings = await self._analyze_lab_trends(observations)
        findings.extend(trend_findings)

        # Analyze vital signs
        vital_findings = await self._analyze_vital_trends(documents)
        findings.extend(vital_findings)

        return findings

    async def _analyze_med_lab_correlations(
        self, medications: List, observations: List
    ) -> List[Dict]:
        """Find correlations between medications and lab results."""

        findings = []

        # Group observations by component
        obs_by_component = {}
        for obs in observations:
            if obs.component_code not in obs_by_component:
                obs_by_component[obs.component_code] = []
            obs_by_component[obs.component_code].append(obs)

        # Check statins and cholesterol
        statin_meds = [
            m for m in medications if "statin" in (m.medication_name or "").lower()
        ]

        if statin_meds and "CHOL" in obs_by_component:
            cholesterol_values = obs_by_component["CHOL"]
            if len(cholesterol_values) >= 2:
                # Calculate change
                earliest = cholesterol_values[0]
                latest = cholesterol_values[-1]

                try:
                    earliest_val = float(earliest.value)
                    latest_val = float(latest.value)
                    pct_change = ((latest_val - earliest_val) / earliest_val) * 100

                    if abs(pct_change) > 15:
                        finding = {
                            "type": "medication_lab_correlation",
                            "description": f"Cholesterol {'decreased' if pct_change < 0 else 'increased'} by {abs(pct_change):.1f}% after starting statin therapy",
                            "confidence": 0.85,
                            "related_records": [str(earliest.id), str(latest.id)],
                            "clinical_significance": "POSITIVE"
                            if pct_change < -15
                            else "REQUIRES_ATTENTION",
                            "recommendation": "Continue current therapy"
                            if pct_change < 0
                            else "Consult your doctor",
                        }
                        findings.append(finding)
                except (ValueError, ZeroDivisionError):
                    pass

        # Check diabetes medications and glucose
        diabetic_meds = [
            m
            for m in medications
            if any(
                x in (m.medication_name or "").lower()
                for x in ["metformin", "insulin", "glimepiride"]
            )
        ]

        if diabetic_meds and "GLUC" in obs_by_component:
            glucose_values = obs_by_component["GLUC"]
            if len(glucose_values) >= 2:
                latest = glucose_values[-1]
                try:
                    glucose_val = float(latest.value)

                    if glucose_val > 200:
                        findings.append(
                            {
                                "type": "alert",
                                "description": f"Recent blood glucose level of {glucose_val} mg/dL is elevated",
                                "confidence": 0.9,
                                "related_records": [str(latest.id)],
                                "clinical_significance": "REQUIRES_ATTENTION",
                                "recommendation": "Schedule follow-up with your doctor",
                            }
                        )
                    elif glucose_val < 70:
                        findings.append(
                            {
                                "type": "alert",
                                "description": f"Recent blood glucose level of {glucose_val} mg/dL is low",
                                "confidence": 0.9,
                                "related_records": [str(latest.id)],
                                "clinical_significance": "REQUIRES_ATTENTION",
                                "recommendation": "Monitor for hypoglycemia symptoms",
                            }
                        )
                except ValueError:
                    pass

        return findings

    async def _analyze_lab_trends(self, observations: List) -> List[Dict]:
        """Analyze trends in lab results over time."""

        findings = []

        # Group by component
        obs_by_component = {}
        for obs in observations:
            key = obs.component_code
            if key not in obs_by_component:
                obs_by_component[key] = []
            obs_by_component[key].append(obs)

        for component, obs_list in obs_by_component.items():
            if len(obs_list) < 3:
                continue

            # Sort by date
            obs_list.sort(key=lambda x: x.observation_date or datetime.min)

            # Simple trend detection (last 3 values)
            recent = obs_list[-3:]
            try:
                values = [float(obs.value) for obs in recent]

                # Check for consistent increase or decrease
                if values[-1] > values[0] * 1.2:
                    findings.append(
                        {
                            "type": "concerning_trend",
                            "description": f"{obs_list[0].component_display or component} showing increasing trend over {len(obs_list)} measurements",
                            "confidence": 0.75,
                            "related_records": [str(obs.id) for obs in recent],
                            "clinical_significance": "MONITOR",
                            "recommendation": f"Consider evaluation for {obs_list[0].component_display or component} abnormality",
                        }
                    )
                elif values[-1] < values[0] * 0.8:
                    findings.append(
                        {
                            "type": "positive_trend",
                            "description": f"{obs_list[0].component_display or component} showing improving trend",
                            "confidence": 0.8,
                            "related_records": [str(obs.id) for obs in recent],
                            "clinical_significance": "POSITIVE",
                            "recommendation": "Continue current management",
                        }
                    )
            except (ValueError, TypeError):
                continue

        return findings

    async def _analyze_vital_trends(self, documents: List) -> List[Dict]:
        """Analyze trends from document AI insights."""

        findings = []

        # Extract vital signs from documents
        bp_readings = []
        weight_readings = []

        for doc in documents:
            if doc.extracted_entities:
                entities = doc.extracted_entities
                if "vitals" in entities:
                    for vital in entities["vitals"]:
                        if vital.get("vital") == "Blood Pressure":
                            bp_readings.append(
                                {
                                    "date": doc.document_date or doc.created_at,
                                    "value": vital.get("value"),
                                    "document_id": str(doc.id),
                                }
                            )

        # Analyze BP trends
        if len(bp_readings) >= 3:
            # Check for hypertension trend
            high_bp_count = 0
            for reading in bp_readings:
                if reading["value"]:
                    parts = reading["value"].split("/")
                    if len(parts) == 2:
                        try:
                            systolic = int(parts[0])
                            if systolic > 140:
                                high_bp_count += 1
                        except ValueError:
                            pass

            if high_bp_count >= len(bp_readings) * 0.5:
                findings.append(
                    {
                        "type": "alert",
                        "description": "Multiple elevated blood pressure readings detected",
                        "confidence": 0.85,
                        "related_records": [r["document_id"] for r in bp_readings],
                        "clinical_significance": "REQUIRES_ATTENTION",
                        "recommendation": "Consult your doctor about blood pressure management",
                    }
                )

        return findings

    async def generate_recommendations(
        self, patient_id: UUID, user_id: str, db: AsyncSession
    ) -> List[Dict[str, str]]:
        """Generate personalized care recommendations."""

        from app.models.models import Patient, Medication, Observation

        recommendations = []

        # Get patient info
        patient_result = await db.execute(
            select(Patient).where(Patient.id == patient_id)
        )
        patient = patient_result.scalar_one_or_none()

        if not patient:
            return recommendations

        # Check for missing follow-ups
        if patient.medical_conditions:
            for condition in patient.medical_conditions:
                if "diabetes" in condition.lower():
                    recommendations.append(
                        {
                            "category": "diabetes",
                            "title": "Diabetes Management",
                            "description": "Regular HbA1c testing recommended every 3 months",
                            "priority": "high",
                            "evidence": ["Patient has diabetes condition documented"],
                        }
                    )

                if "hypertension" in condition.lower():
                    recommendations.append(
                        {
                            "category": "cardiovascular",
                            "title": "Blood Pressure Monitoring",
                            "description": "Monitor BP daily and maintain log",
                            "priority": "high",
                            "evidence": [
                                "Patient has hypertension condition documented"
                            ],
                        }
                    )

        # Check for missing labs
        obs_result = await db.execute(
            select(Observation)
            .where(Observation.patient_id == patient_id)
            .order_by(Observation.observation_date.desc())
        )
        observations = obs_result.scalars().all()

        # Check for overdue tests
        recent_tests = set()
        for obs in observations[:10]:
            recent_tests.add(obs.component_code)

        if "HBA1C" not in recent_tests:
            recommendations.append(
                {
                    "category": "screening",
                    "title": "HbA1c Test",
                    "description": "Consider getting HbA1c test for diabetes monitoring",
                    "priority": "medium",
                    "evidence": ["No HbA1c test in recent records"],
                }
            )

        if "LIPID" not in recent_tests and patient.medical_conditions:
            recommendations.append(
                {
                    "category": "cardiovascular",
                    "title": "Lipid Profile",
                    "description": "Annual lipid profile recommended",
                    "priority": "medium",
                    "evidence": ["No lipid test in recent records"],
                }
            )

        return recommendations

    async def generate_health_summary(
        self, recent_documents: List, medications: List, lab_results: List
    ) -> Dict[str, Any]:
        """Generate a comprehensive health summary."""

        summary = {
            "overview": "",
            "key_findings": [],
            "concerns": [],
            "positive_indicators": [],
            "pending_actions": [],
        }

        # Analyze medications
        if medications:
            summary["overview"] = (
                f"You have {len(medications)} active medication(s) on record."
            )

        # Analyze recent labs
        abnormal_labs = []
        for lab in lab_results[:5]:
            if lab.interpretation == "H" or lab.interpretation == "L":
                abnormal_labs.append(lab)

        if abnormal_labs:
            summary["concerns"] = [
                f"{lab.component_display}: {lab.value} {lab.value_unit} (abnormal)"
                for lab in abnormal_labs
            ]

        # Generate overview text
        doc_types = [d.document_type.value for d in recent_documents[:3]]
        if doc_types:
            summary["overview"] += f" Recent documents include: {', '.join(doc_types)}."

        return summary

    # Placeholder methods for specific correlations
    async def _analyze_statins_cholesterol(self, meds, labs):
        return []

    async def _analyze_metformin_glucose(self, meds, labs):
        return []

    async def _analyze_metformin_hba1c(self, meds, labs):
        return []

    async def _analyze_thyroid_medication(self, meds, labs):
        return []

    async def _analyze_bp_trends(self, meds, labs):
        return []


# Singleton instance
correlation_service = CorrelationService()
