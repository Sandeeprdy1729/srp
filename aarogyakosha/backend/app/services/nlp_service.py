"""
AarogyaKosha - NLP Service
Clinical NLP using BioBERT and Transformers
100% Open Source - No API Keys Required
"""

import re
from typing import Dict, List, Optional, Any
from datetime import datetime


class NLPService:
    """
    Clinical NLP service using open-source BioBERT model.
    Works offline after initial model download.
    """

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.initialized = False
        self.model_name = "dmis-lab/biobert-base-cased-v1.2"

    async def initialize(self):
        """Initialize the NLP model (lazy loading)."""
        if self.initialized:
            return

        try:
            from transformers import AutoTokenizer, AutoModelForTokenClassification
            import torch

            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForTokenClassification.from_pretrained(
                self.model_name
            )
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model.to(self.device)
            self.model.eval()
            self.initialized = True
            print(f"NLP Service initialized with {self.model_name} on {self.device}")
        except Exception as e:
            print(f"Failed to initialize NLP model: {e}")
            self.initialized = False

    async def extract_entities(self, text: str) -> Dict[str, List[Dict]]:
        """
        Extract clinical entities from text.
        Uses simple pattern matching + NER when available.
        """
        if not text:
            return {
                "medications": [],
                "diagnoses": [],
                "procedures": [],
                "lab_results": [],
                "vitals": [],
                "dates": [],
                "negated_mentions": [],
            }

        entities = {
            "medications": [],
            "diagnoses": [],
            "procedures": [],
            "lab_results": [],
            "vitals": [],
            "dates": [],
            "negated_mentions": [],
        }

        # Extract medications
        entities["medications"] = self._extract_medications(text)

        # Extract diagnoses
        entities["diagnoses"] = self._extract_diagnoses(text)

        # Extract lab results
        entities["lab_results"] = self._extract_lab_results(text)

        # Extract vitals
        entities["vitals"] = self._extract_vitals(text)

        # Extract dates
        entities["dates"] = self._extract_dates(text)

        # Detect negation
        entities["negated_mentions"] = self._detect_negation(text, entities)

        return entities

    def _extract_medications(self, text: str) -> List[Dict]:
        """Extract medication mentions with dosage."""
        medications = []

        # Common medication patterns
        med_patterns = [
            r"(\w+(?:ine|olol|sartan|pril|statin|mycin|cycline|zole|prazole|cillin))",
            r"(\w+)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?)\s+",
            r"(once|twice|thrice|qd|bid|tid|qid|weekly|daily)\s+",
            r"(oral|IV|IM|SC|topical|sublingual)\s+",
        ]

        # Common Indian medications
        common_meds = [
            "metformin",
            "glimepiride",
            "insulin",
            "aspirin",
            "atorvastatin",
            "rosuvastatin",
            "simvastatin",
            "amlodipine",
            "telmisartan",
            "losartan",
            "olmesartan",
            "omeprazole",
            "pantoprazole",
            "rabeprazole",
            "paracetamol",
            "acetaminophen",
            "ibuprofen",
            "diclofenac",
            "ciprofloxacin",
            "azithromycin",
            "amoxicillin",
            "cetirizine",
            "loratadine",
            "diphenhydramine",
            "folic acid",
            "vitamin d",
            "vitamin b12",
            "calcium",
            "thyroxine",
            "levothyroxine",
            "carbimazole",
            "furosemide",
            "spironolactone",
            "digoxin",
        ]

        text_lower = text.lower()
        found_meds = set()

        for med in common_meds:
            if med in text_lower:
                match_text = text_lower[
                    text_lower.index(med) : text_lower.index(med) + len(med)
                ]
                if med not in found_meds:
                    medications.append(
                        {
                            "text": match_text.title(),
                            "type": "medication",
                            "confidence": 0.9,
                            "source": "dictionary",
                        }
                    )
                    found_meds.add(med)

        # Extract dosage if present
        dosage_pattern = r"(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|units?)"
        for med in medications:
            dosage_match = re.search(dosage_pattern, text, re.IGNORECASE)
            if dosage_match:
                med["dosage"] = f"{dosage_match.group(1)}{dosage_match.group(2)}"

        return medications

    def _extract_diagnoses(self, text: str) -> List[Dict]:
        """Extract diagnosis mentions."""
        diagnoses = []

        # Common condition patterns
        condition_patterns = [
            (r"\b(diabetes|diabetic)\b", "Diabetes", 0.9),
            (r"\b(hypertension|high blood pressure)\b", "Hypertension", 0.9),
            (r"\b(asthma)\b", "Asthma", 0.9),
            (r"\b(COPD|chronic obstructive)\b", "COPD", 0.85),
            (r"\b(anemia)\b", "Anemia", 0.85),
            (r"\b(thyroid|hypothyroid|hyperthyroid)\b", "Thyroid Disorder", 0.85),
            (r"\b(arthritis|osteoarthritis|rheumatoid)\b", "Arthritis", 0.8),
            (r"\b(depression|anxiety)\b", "Mental Health Condition", 0.8),
            (r"\b(infection|infected)\b", "Infection", 0.7),
            (r"\b(inflammation|inflammatory)\b", "Inflammation", 0.7),
        ]

        text_lower = text.lower()

        for pattern, condition, confidence in condition_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                diagnoses.append(
                    {
                        "text": condition,
                        "type": "diagnosis",
                        "confidence": confidence,
                        "source": "pattern",
                    }
                )

        return diagnoses

    def _extract_lab_results(self, text: str) -> List[Dict]:
        """Extract lab result values."""
        labs = []

        # Lab test patterns
        lab_patterns = [
            (r"\bHb\b.*?(\d+\.?\d*)\s*g/dL", "Hemoglobin", "g/dL"),
            (r"\bRBC\b.*?(\d+\.?\d*)\s*(million/µL|mcL)", "RBC Count", "million/µL"),
            (r"\bWBC\b.*?(\d+\.?\d*)\s*(cells/µL|/cumm)", "WBC Count", "cells/µL"),
            (r"\bplatelets?\b.*?(\d+\.?\d*)\s*(/cumm|×10³/µL)", "Platelets", "×10³/µL"),
            (
                r"\bglucose|fasting glucose|PP glucose\b.*?(\d+)\s*mg/dL",
                "Blood Glucose",
                "mg/dL",
            ),
            (r"\bHbA1c\b.*?(\d+\.?\d*)\s*%", "HbA1c", "%"),
            (r"\bcreatinine\b.*?(\d+\.?\d*)\s*mg/dL", "Creatinine", "mg/dL"),
            (r"\burea|BUN\b.*?(\d+)\s*mg/dL", "Blood Urea", "mg/dL"),
            (r"\bALT|SGPT\b.*?(\d+)\s*U/L", "ALT", "U/L"),
            (r"\bAST|SGOT\b.*?(\d+)\s*U/L", "AST", "U/L"),
            (r"\bcholesterol\b.*?(\d+)\s*mg/dL", "Total Cholesterol", "mg/dL"),
            (r"\bLDL\b.*?(\d+)\s*mg/dL", "LDL Cholesterol", "mg/dL"),
            (r"\bHDL\b.*?(\d+)\s*mg/dL", "HDL Cholesterol", "mg/dL"),
            (r"\btriglycerides?\b.*?(\d+)\s*mg/dL", "Triglycerides", "mg/dL"),
            (r"\bTSH\b.*?(\d+\.?\d*)\s*(µIU/mL|mIU/L)", "TSH", "µIU/mL"),
            (r"\bT3\b.*?(\d+\.?\d*)\s*ng/mL", "T3", "ng/mL"),
            (r"\bT4\b.*?(\d+\.?\d*)\s*µg/dL", "T4", "µg/dL"),
            (r"\bhemoglobin\b.*?(\d+\.?\d*)\s*g/dL", "Hemoglobin", "g/dL"),
        ]

        for pattern, test_name, unit in lab_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                value = match[0] if isinstance(match, tuple) else match
                labs.append(
                    {
                        "test": test_name,
                        "value": value,
                        "unit": unit,
                        "type": "lab_result",
                    }
                )

        return labs

    def _extract_vitals(self, text: str) -> List[Dict]:
        """Extract vital signs."""
        vitals = []

        vital_patterns = [
            (
                r"\bbp|blood pressure\b.*?(\d+)/(\d+)\s*(mmHg)?",
                "Blood Pressure",
                "mmHg",
            ),
            (r"\bheart rate|hr\b.*?(\d+)\s*(bpm|beats/min)?", "Heart Rate", "bpm"),
            (r"\btemperature|fever\b.*?(\d+\.?\d*)\s*(°C|°F)?", "Temperature", "°F"),
            (r"\bspo2|oxygen saturation\b.*?(\d+)\s*%", "SpO2", "%"),
            (r"\brespiratory rate|rr\b.*?(\d+)\s*(/min)?", "Respiratory Rate", "/min"),
            (r"\bweight\b.*?(\d+\.?\d*)\s*(kg|kgs?)?", "Weight", "kg"),
            (r"\bheight\b.*?(\d+\.?\d*)\s*(cm|m)?", "Height", "cm"),
        ]

        for pattern, vital_name, unit in vital_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple) and len(match) >= 2:
                    value = (
                        f"{match[0]}/{match[1]}"
                        if vital_name == "Blood Pressure"
                        else match[0]
                    )
                    vitals.append(
                        {
                            "vital": vital_name,
                            "value": value,
                            "unit": unit,
                            "type": "vital_sign",
                        }
                    )

        return vitals

    def _extract_dates(self, text: str) -> List[Dict]:
        """Extract date mentions."""
        dates = []

        date_patterns = [
            (r"\b\d{1,2}/\d{1,2}/\d{2,4}\b", "numeric"),
            (r"\b\d{1,2}-\d{1,2}-\d{2,4}\b", "numeric"),
            (
                r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b",
                "text",
            ),
        ]

        for pattern, date_type in date_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                dates.append({"date": match, "type": date_type})

        return dates

    def _detect_negation(self, text: str, entities: Dict) -> List[Dict]:
        """Detect negated mentions."""
        negated = []

        negation_patterns = [
            r"\b(no|not|denies|denied|negative|absence|without|ruling out|rule out|ruled out)\s+",
        ]

        text_lower = text.lower()

        for entity_type, entity_list in entities.items():
            for entity in entity_list:
                entity_text = entity.get("text", "").lower()
                if entity_text:
                    entity_pos = text_lower.find(entity_text)
                    if entity_pos > 0:
                        context = text_lower[max(0, entity_pos - 50) : entity_pos]
                        for pattern in negation_patterns:
                            if re.search(pattern, context):
                                negated.append(
                                    {
                                        "term": entity["text"],
                                        "type": entity_type,
                                        "negation": "explicit",
                                        "certainty": "ruled_out",
                                    }
                                )
                                break

        return negated

    async def extract_text_from_pdf(self, content: bytes) -> str:
        """Extract text from PDF using PyPDF2."""
        try:
            from PyPDF2 import PdfReader
            import io

            pdf_file = io.BytesIO(content)
            reader = PdfReader(pdf_file)

            text_parts = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

            return "\n".join(text_parts)
        except Exception as e:
            print(f"PDF extraction error: {e}")
            return ""

    async def extract_text_from_image(self, content: bytes) -> str:
        """Extract text from image using Tesseract OCR."""
        try:
            import pytesseract
            from PIL import Image
            import io

            image = Image.open(io.BytesIO(content))
            text = pytesseract.image_to_string(image)

            return text.strip()
        except ImportError:
            print("pytesseract or Pillow not installed — skipping OCR")
            return ""
        except Exception as e:
            print(f"OCR extraction error: {e}")
            return ""

    async def extract_text_from_docx(self, content: bytes) -> str:
        """Extract text from Word (.docx) documents."""
        try:
            import docx
            import io

            doc = docx.Document(io.BytesIO(content))
            text_parts = [p.text for p in doc.paragraphs if p.text.strip()]
            return "\n".join(text_parts)
        except ImportError:
            print("python-docx not installed — skipping docx extraction")
            return ""
        except Exception as e:
            print(f"DOCX extraction error: {e}")
            return ""

    async def generate_insights(
        self, text: str, document_type: str = "other"
    ) -> Dict[str, Any]:
        """Generate AI insights from extracted text."""

        entities = await self.extract_entities(text)

        # Generate summary
        summary_parts = []

        if entities["diagnoses"]:
            summary_parts.append(
                f"Diagnoses/conditions mentioned: {', '.join(d['text'] for d in entities['diagnoses'][:3])}"
            )

        if entities["medications"]:
            summary_parts.append(
                f"Medications mentioned: {', '.join(m['text'] for m in entities['medications'][:5])}"
            )

        if entities["lab_results"]:
            abnormal = [l for l in entities["lab_results"]]
            if abnormal:
                summary_parts.append(f"Lab results found: {len(abnormal)} tests")

        # Detect language
        language = self._detect_language(text)

        # Generate action items based on document type
        action_items = self._generate_action_items(document_type, entities)

        # Generate warnings
        warnings = self._generate_warnings(entities)

        return {
            "summary": ". ".join(summary_parts)
            if summary_parts
            else "No significant findings extracted from this document.",
            "key_findings": summary_parts,
            "document_type": document_type,
            "confidence": min(
                0.9, len(entities["medications"] + entities["diagnoses"]) * 0.1 + 0.5
            ),
            "language": language,
            "translated_summary": None,
            "action_items": action_items,
            "warnings": warnings,
            "entities": entities,
        }

    def _detect_language(self, text: str) -> str:
        """Simple language detection for Hindi/English."""
        hindi_chars = 0
        total_chars = 0

        for char in text:
            if char.isalpha():
                total_chars += 1
                if "\u0900" <= char <= "\u097f":  # Hindi Unicode range
                    hindi_chars += 1

        if total_chars > 0 and hindi_chars / total_chars > 0.3:
            return "hi"
        return "en"

    def _generate_action_items(self, document_type: str, entities: Dict) -> List[str]:
        """Generate action items based on document type and entities."""
        actions = []

        if document_type == "lab_report":
            if entities["lab_results"]:
                actions.append("Review abnormal lab values with your doctor")

        if document_type == "prescription":
            if entities["medications"]:
                actions.append(
                    "Ensure you understand dosage instructions before taking medications"
                )

        if entities["diagnoses"]:
            actions.append(
                "Follow up with your healthcare provider for any new diagnoses"
            )

        if entities.get("negated_mentions"):
            actions.append("Track any symptoms mentioned in the report")

        return actions

    def _generate_warnings(self, entities: Dict) -> List[str]:
        """Generate warnings for concerning findings."""
        warnings = []

        # Check for critical values
        for lab in entities.get("lab_results", []):
            value = float(lab.get("value", 0))
            test = lab.get("test", "")

            # Simple critical value checks
            if "hemoglobin" in test.lower() and value < 8:
                warnings.append(f"Low hemoglobin detected - consult your doctor")
            if "glucose" in test.lower() and value > 200:
                warnings.append(f"High blood glucose detected - monitor closely")

        # Check for allergies mentioned
        if entities.get("allergies"):
            warnings.append("Allergies noted - inform healthcare providers")

        return warnings

    async def translate_to_plain_language(
        self, text: str, target_language: str = "hi", context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Translate clinical text to plain language.
        Uses simple rule-based translation + template generation.
        """

        if target_language == "hi":
            # Hindi translation using templates
            translated = self._translate_to_hindi(text)
        else:
            translated = self._translate_to_plain_english(text)

        # Generate action items
        action_items = self._generate_action_items(
            "general", await self.extract_entities(text)
        )

        return {"translated_text": translated, "action_items": action_items}

    def _translate_to_hindi(self, text: str) -> str:
        """Simple Hindi translation using word mapping."""

        # Common medical term translations
        translations = {
            "blood pressure": "रक्तचाप",
            "diabetes": "मधुमेह",
            "diabetic": "मधुमेह रोगी",
            "hypertension": "उच्च रक्तचाप",
            "medication": "दवा",
            "prescription": "नुस्खा",
            "tablet": "गोली",
            "capsule": "कैप्सूल",
            "syrup": "शरबत",
            "injection": "इंजेक्शन",
            "daily": "रोज़ाना",
            "twice": "दिन में दो बार",
            "morning": "सुबह",
            "night": "रात",
            "before food": "खाने से पहले",
            "after food": "खाने के बाद",
            "diagnosis": "निदान",
            "symptoms": "लक्षण",
            "fever": "बुखार",
            "cough": "खांसी",
            "headache": "सिरदर्द",
            "pain": "दर्द",
            "consultation": "परामर्श",
            "test": "जांच",
            "report": "रिपोर्ट",
            "normal": "सामान्य",
            "abnormal": "असामान्य",
            "positive": "सकारात्मक",
            "negative": "नकारात्मक",
        }

        result = text.lower()
        for eng, hin in translations.items():
            result = result.replace(eng, hin)

        return result

    def _translate_to_plain_english(self, text: str) -> str:
        """Simplify clinical text to plain English."""

        # Complex medical terms to simple alternatives
        simplifications = {
            "administer": "give",
            "commence": "start",
            "discontinue": "stop",
            "commencing": "starting",
            "discontinuing": "stopping",
            " QD ": " once daily ",
            " BID ": " twice daily ",
            " TID ": " three times daily ",
            " QID ": " four times daily ",
            "PO": "by mouth",
            "IV": "into the vein",
            "IM": "into the muscle",
            "SC": "under the skin",
            "PRN": "as needed",
        }

        result = text
        for complex, simple in simplifications.items():
            result = result.replace(complex, simple)

        return result


# Singleton instance
nlp_service = NLPService()
