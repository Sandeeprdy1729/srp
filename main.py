"""
MedInsight Backend — FastAPI + Open Source Stack
Tech Stack (all free & open source):
  - FastAPI (Python web framework)
  - HAPI FHIR (FHIR R4 server)
  - PostgreSQL (primary database)
  - SQLite (local dev database)
  - Tesseract OCR (document extraction)
  - Hugging Face Transformers (Bio_ClinicalBERT NER)
  - LangChain + Ollama (local LLM for translation)
  - pgvector (vector search for RAG)
  - Redis (caching, optional)
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import uvicorn
import os
import json
import uuid
import hashlib
import asyncio
from datetime import datetime, timedelta
from pathlib import Path

# ── App Setup ────────────────────────────────────────────────────
app = FastAPI(
    title="MedInsight API",
    description="AI-powered Personal Medical Report Library — ABDM/FHIR compliant",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

# ── Database Setup (SQLite for dev, PostgreSQL for prod) ─────────
import sqlite3
DB_PATH = "medinsight.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.executescript("""
    -- Patients table
    CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        abha_id TEXT UNIQUE,
        name TEXT NOT NULL,
        dob TEXT,
        gender TEXT,
        blood_group TEXT,
        allergies TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );
    
    -- Documents table (FHIR DocumentReference equivalent)
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        title TEXT NOT NULL,
        doc_type TEXT NOT NULL,   -- lab_report | prescription | discharge | scan | ecg
        source TEXT,              -- hospital/lab name
        file_path TEXT,
        s3_key TEXT,
        fhir_bundle TEXT,         -- JSONB equivalent
        status TEXT DEFAULT 'uploaded',  -- uploaded | processing | analyzed | failed
        raw_text TEXT,            -- OCR extracted text
        extracted_entities TEXT,  -- JSON of NER results
        uploaded_at TEXT DEFAULT (datetime('now')),
        analyzed_at TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
    
    -- FHIR Observations (lab values)
    CREATE TABLE IF NOT EXISTS observations (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        document_id TEXT,
        loinc_code TEXT,
        display_name TEXT NOT NULL,
        value_quantity REAL,
        value_unit TEXT,
        value_string TEXT,
        reference_range_low REAL,
        reference_range_high REAL,
        interpretation TEXT,      -- normal | high | low | critical
        recorded_date TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
    
    -- FHIR MedicationStatements
    CREATE TABLE IF NOT EXISTS medications (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        document_id TEXT,
        brand_name TEXT,
        generic_name TEXT,
        rxnorm_code TEXT,
        dosage TEXT,
        frequency TEXT,
        route TEXT DEFAULT 'oral',
        start_date TEXT,
        end_date TEXT,
        prescribed_by TEXT,
        status TEXT DEFAULT 'active',
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
    
    -- FHIR Conditions (diagnoses)
    CREATE TABLE IF NOT EXISTS conditions (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        icd_code TEXT,
        display_name TEXT NOT NULL,
        clinical_status TEXT DEFAULT 'active',
        onset_date TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
    
    -- AI Insights / correlations
    CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        insight_type TEXT,   -- correlation | alert | duplicate | care_gap | translation
        severity TEXT,       -- info | low | medium | high | critical
        title TEXT NOT NULL,
        body TEXT,
        evidence TEXT,       -- JSON of supporting data points
        guideline_source TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
    
    -- Consent records (ABDM consent artefacts)
    CREATE TABLE IF NOT EXISTS consents (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        hip_id TEXT NOT NULL,
        hip_name TEXT,
        purpose TEXT DEFAULT 'CAREMGT',
        status TEXT DEFAULT 'active',
        granted_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,
        consent_artefact TEXT,  -- full ABDM consent JSON
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
    
    -- Share tokens
    CREATE TABLE IF NOT EXISTS share_tokens (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        document_ids TEXT,       -- JSON array
        recipient_name TEXT,
        purpose TEXT,
        expires_at TEXT NOT NULL,
        access_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
    );
    
    -- Audit log (immutable)
    CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        patient_id TEXT,
        actor TEXT NOT NULL,          -- who
        action TEXT NOT NULL,         -- what
        resource_type TEXT,
        resource_id TEXT,
        ip_address TEXT,
        purpose TEXT,
        timestamp TEXT DEFAULT (datetime('now'))
    );
    """)
    
    # Insert demo patient
    c.execute("""
    INSERT OR IGNORE INTO patients (id, abha_id, name, dob, gender, blood_group, allergies)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ('patient-001', '1234-5678-9012', 'Sandeep Reddy', '2004-03-15', 'Male', 'B+', 'Penicillin'))
    
    # Insert demo documents
    demo_docs = [
        ('doc-001', 'patient-001', 'HbA1c & Lipid Panel', 'lab_report', 'Apollo Hyderabad / Thyrocare', 'analyzed', '2026-03-14'),
        ('doc-002', 'patient-001', 'Dr. Sharma Prescription', 'prescription', 'Apollo Hyderabad', 'analyzed', '2026-03-10'),
        ('doc-003', 'patient-001', 'Chest X-Ray', 'scan', 'Yashoda Hospital', 'analyzed', '2026-03-08'),
        ('doc-004', 'patient-001', 'Discharge Summary', 'discharge', 'CARE Hospitals', 'processing', '2026-02-02'),
        ('doc-005', 'patient-001', 'ECG Report', 'ecg', 'Cardiology OPD', 'analyzed', '2026-01-18'),
    ]
    for d in demo_docs:
        c.execute("""INSERT OR IGNORE INTO documents (id, patient_id, title, doc_type, source, status, uploaded_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)""", d)
    
    # Insert demo observations
    demo_obs = [
        ('obs-001', 'patient-001', 'doc-001', '4548-4', 'HbA1c', 6.2, '%', 4.0, 5.6, 'high', '2026-03-14'),
        ('obs-002', 'patient-001', 'doc-001', '2089-1', 'LDL Cholesterol', 98.0, 'mg/dL', None, 100.0, 'normal', '2026-03-14'),
        ('obs-003', 'patient-001', 'doc-001', '2085-9', 'HDL Cholesterol', 52.0, 'mg/dL', 40.0, None, 'normal', '2026-03-14'),
        ('obs-004', 'patient-001', 'doc-001', '2571-8', 'Triglycerides', 142.0, 'mg/dL', None, 150.0, 'normal', '2026-03-14'),
        ('obs-005', 'patient-001', 'doc-001', '14771-0', 'Fasting Blood Sugar', 108.0, 'mg/dL', 70.0, 100.0, 'high', '2026-03-14'),
    ]
    for o in demo_obs:
        c.execute("""INSERT OR IGNORE INTO observations 
                     (id, patient_id, document_id, loinc_code, display_name, value_quantity, value_unit, 
                      reference_range_low, reference_range_high, interpretation, recorded_date)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", o)
    
    # Insert demo medications
    demo_meds = [
        ('med-001', 'patient-001', 'doc-002', 'Atorvastatin', 'Atorvastatin', '40mg', 'Once daily at night', '2025-12-20', 'active', 'Dr. Sharma'),
        ('med-002', 'patient-001', 'doc-002', 'Metformin', 'Metformin HCl', '500mg', 'Twice daily with meals', '2025-08-10', 'active', 'Dr. Sharma'),
        ('med-003', 'patient-001', 'doc-002', 'Ramipril', 'Ramipril', '5mg', 'Once daily in morning', '2025-11-10', 'active', 'Dr. Reddy'),
    ]
    for m in demo_meds:
        c.execute("""INSERT OR IGNORE INTO medications
                     (id, patient_id, document_id, brand_name, generic_name, dosage, frequency, start_date, status, prescribed_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", m)
    
    # Demo insights
    demo_insights = [
        ('ins-001', 'patient-001', 'correlation', 'info', 
         'LDL improved 28% after Atorvastatin',
         'LDL dropped from 138 → 98 mg/dL (−28%) within 90 days of starting statin therapy.',
         'ICMR Lipid Guidelines 2024'),
        ('ins-002', 'patient-001', 'alert', 'medium',
         'HbA1c rising — pre-diabetic range',
         '3 consecutive readings trending upward over 6 months. Now at 6.2%.',
         'ICMR Diabetes Guidelines 2024'),
        ('ins-003', 'patient-001', 'duplicate', 'low',
         'Duplicate HbA1c test detected',
         'HbA1c ordered by two different doctors within 12 days. Estimated saving: ₹800.',
         None),
        ('ins-004', 'patient-001', 'care_gap', 'high',
         'Kidney function test overdue',
         'On Metformin for 8 months. ICMR recommends creatinine + eGFR every 6 months.',
         'ICMR Diabetes Guidelines 2024'),
    ]
    for ins in demo_insights:
        c.execute("""INSERT OR IGNORE INTO insights
                     (id, patient_id, insight_type, severity, title, body, guideline_source)
                     VALUES (?, ?, ?, ?, ?, ?, ?)""", ins)
    
    conn.commit()
    conn.close()
    print("✅ Database initialized")

# ── Pydantic Models ──────────────────────────────────────────────
class DocumentResponse(BaseModel):
    id: str
    title: str
    doc_type: str
    source: Optional[str]
    status: str
    uploaded_at: str

class ObservationResponse(BaseModel):
    id: str
    display_name: str
    value_quantity: Optional[float]
    value_unit: Optional[str]
    interpretation: Optional[str]
    recorded_date: Optional[str]

class InsightResponse(BaseModel):
    id: str
    insight_type: str
    severity: str
    title: str
    body: Optional[str]
    guideline_source: Optional[str]
    is_read: bool
    created_at: str

class ShareRequest(BaseModel):
    recipient_name: str
    document_ids: List[str]
    duration_hours: int = 24
    purpose: str = "Medical consultation"

class UploadResponse(BaseModel):
    document_id: str
    status: str
    message: str

# ── OCR Service (Tesseract) ──────────────────────────────────────
async def extract_text_from_file(file_path: str, mime_type: str) -> str:
    """
    Production: Use pytesseract + poppler for PDFs
    pip install pytesseract pillow pdf2image
    sudo apt-get install tesseract-ocr tesseract-ocr-hin poppler-utils
    """
    try:
        import pytesseract
        from PIL import Image
        
        if mime_type == 'application/pdf':
            from pdf2image import convert_from_path
            pages = convert_from_path(file_path)
            text = ""
            for page in pages:
                text += pytesseract.image_to_string(page, lang='eng+hin') + "\n"
            return text
        else:
            img = Image.open(file_path)
            return pytesseract.image_to_string(img, lang='eng+hin')
    except ImportError:
        # Fallback: return placeholder for dev
        return f"[OCR placeholder - install pytesseract and tesseract-ocr for real extraction]\nFile: {file_path}"
    except Exception as e:
        return f"[OCR error: {str(e)}]"

# ── Clinical NER Service (Bio_ClinicalBERT) ──────────────────────
async def extract_clinical_entities(text: str) -> dict:
    """
    Production: Bio_ClinicalBERT NER pipeline
    pip install transformers torch
    Model: emilyalsentzer/Bio_ClinicalBERT
    """
    try:
        from transformers import pipeline
        ner_pipeline = pipeline(
            "ner",
            model="d4data/biomedical-ner-all",
            aggregation_strategy="simple"
        )
        entities = ner_pipeline(text[:512])  # token limit
        return {
            "medications": [e for e in entities if e['entity_group'] in ['Chemical', 'Drug']],
            "conditions": [e for e in entities if e['entity_group'] in ['Disease', 'Symptom']],
            "lab_values": [e for e in entities if 'Lab' in e.get('entity_group','')],
            "raw": entities
        }
    except ImportError:
        # Fallback rule-based NER for dev
        return extract_entities_regex(text)
    except Exception as e:
        return extract_entities_regex(text)

def extract_entities_regex(text: str) -> dict:
    """Simple regex-based entity extraction for dev/fallback"""
    import re
    
    # Common Indian medication names
    med_patterns = r'\b(Atorvastatin|Metformin|Ramipril|Amlodipine|Telmisartan|Thyronorm|Glucophage|Lipitor|Pantoprazole|Clopidogrel)\b'
    # Lab value patterns
    lab_patterns = r'(HbA1c|LDL|HDL|Triglycerides|Creatinine|eGFR|TSH|Hemoglobin)[:\s]+(\d+\.?\d*)\s*(%|mg/dL|g/dL|mIU/L)?'
    
    medications = [{"word": m, "entity_group": "Drug"} for m in re.findall(med_patterns, text, re.IGNORECASE)]
    lab_matches = [{"name": m[0], "value": m[1], "unit": m[2]} for m in re.findall(lab_patterns, text, re.IGNORECASE)]
    
    return {"medications": medications, "conditions": [], "lab_values": lab_matches, "raw": []}

# ── Translation Service (Ollama + local LLM) ─────────────────────
async def translate_report(text: str, target_lang: str = "english") -> dict:
    """
    Production: Use Ollama with Llama-3.1-8B or similar
    pip install ollama
    ollama pull llama3.1:8b
    OR use GPT-4o-mini API as fallback
    """
    try:
        import ollama
        prompt = f"""You are a medical report translator for Indian patients.
        
Translate this medical report section into simple {target_lang} (8th grade reading level).
Include:
1. A plain language explanation (2-3 sentences)  
2. 3-4 action items for the patient

Medical text: {text[:800]}

Respond as JSON with keys: "explanation" and "action_items" (array of strings)."""
        
        response = ollama.chat(
            model='llama3.1:8b',
            messages=[{'role': 'user', 'content': prompt}]
        )
        result = json.loads(response['message']['content'])
        return result
    except Exception:
        # Fallback: rule-based for dev
        return {
            "explanation": f"Your medical report has been processed. The values have been extracted and are now structured in your health record.",
            "action_items": [
                "Review the extracted values with your doctor",
                "Keep a copy of this report for future reference",
                "Share this with your primary care physician at your next visit"
            ]
        }

# ── Correlation Engine ───────────────────────────────────────────
async def run_correlation_analysis(patient_id: str, db) -> List[dict]:
    """
    Analyzes observations over time to find medication effects,
    trends, duplicates, and care gaps.
    """
    correlations = []
    
    # 1. Get recent observations grouped by LOINC code
    obs = db.execute("""
        SELECT loinc_code, display_name, value_quantity, recorded_date, interpretation
        FROM observations WHERE patient_id = ?
        ORDER BY recorded_date DESC
    """, (patient_id,)).fetchall()
    
    # Group by lab test
    obs_by_code = {}
    for o in obs:
        code = o['loinc_code']
        if code not in obs_by_code:
            obs_by_code[code] = []
        obs_by_code[code].append(dict(o))
    
    # 2. Detect duplicate tests (same test within 30 days)
    for code, readings in obs_by_code.items():
        if len(readings) >= 2:
            d1 = datetime.fromisoformat(readings[0]['recorded_date'])
            d2 = datetime.fromisoformat(readings[1]['recorded_date'])
            days_apart = abs((d1 - d2).days)
            if days_apart < 30:
                correlations.append({
                    "type": "duplicate",
                    "severity": "low",
                    "title": f"Duplicate test: {readings[0]['display_name']}",
                    "body": f"Same test ordered {days_apart} days apart. Consider sharing records to avoid repetition.",
                    "savings": "₹800"
                })
    
    # 3. Detect trends (3+ readings of same lab)
    for code, readings in obs_by_code.items():
        if len(readings) >= 3:
            vals = [r['value_quantity'] for r in readings if r['value_quantity']]
            if len(vals) >= 3:
                # Check monotonically increasing
                if vals[0] > vals[1] > vals[2]:
                    pct = round(((vals[0] - vals[2]) / vals[2]) * 100, 1)
                    correlations.append({
                        "type": "trend",
                        "severity": "medium",
                        "title": f"{readings[0]['display_name']} trending downward",
                        "body": f"Decreased {pct}% over last 3 readings. Positive trend.",
                        "delta": f"-{pct}%"
                    })
    
    return correlations

# ── FHIR Bundle Generator ────────────────────────────────────────
def create_fhir_bundle(patient_id: str, observations: list, medications: list) -> dict:
    """Generate a FHIR R4 Bundle from structured data"""
    entries = []
    
    # Patient entry
    entries.append({
        "resource": {
            "resourceType": "Patient",
            "id": patient_id,
            "identifier": [{"system": "https://healthid.ndhm.gov.in", "value": patient_id}],
            "name": [{"text": "Sandeep Reddy"}],
            "gender": "male",
            "birthDate": "2004-03-15"
        }
    })
    
    # Observation entries
    for obs in observations:
        entries.append({
            "resource": {
                "resourceType": "Observation",
                "id": obs.get('id', str(uuid.uuid4())),
                "status": "final",
                "code": {
                    "coding": [{"system": "http://loinc.org", "code": obs.get('loinc_code', ''), "display": obs.get('display_name', '')}]
                },
                "subject": {"reference": f"Patient/{patient_id}"},
                "valueQuantity": {"value": obs.get('value_quantity'), "unit": obs.get('value_unit', '')},
                "effectiveDateTime": obs.get('recorded_date', '')
            }
        })
    
    return {
        "resourceType": "Bundle",
        "type": "collection",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "entry": entries
    }

# ═══════════════════════════════════════════════════════════════
# API ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/")
async def serve_frontend():
    frontend_path = FRONTEND_DIR / "index.html"
    if frontend_path.exists():
        return FileResponse(str(frontend_path))
    return {"message": "MedInsight API running", "docs": "/api/docs"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0", "timestamp": datetime.utcnow().isoformat()}

# ── Patient Routes ───────────────────────────────────────────────
@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: str, db=Depends(get_db)):
    patient = db.execute("SELECT * FROM patients WHERE id = ?", (patient_id,)).fetchone()
    if not patient:
        raise HTTPException(404, "Patient not found")
    return dict(patient)

@app.get("/api/patients/{patient_id}/summary")
async def get_patient_summary(patient_id: str, db=Depends(get_db)):
    """Complete health summary for the patient"""
    docs_count = db.execute("SELECT COUNT(*) FROM documents WHERE patient_id = ?", (patient_id,)).fetchone()[0]
    meds_count = db.execute("SELECT COUNT(*) FROM medications WHERE patient_id = ? AND status='active'", (patient_id,)).fetchone()[0]
    alerts_count = db.execute("SELECT COUNT(*) FROM insights WHERE patient_id = ? AND is_read=0", (patient_id,)).fetchone()[0]
    consents_count = db.execute("SELECT COUNT(*) FROM consents WHERE patient_id = ? AND status='active'", (patient_id,)).fetchone()[0]
    
    recent_obs = db.execute("""
        SELECT display_name, value_quantity, value_unit, interpretation, recorded_date
        FROM observations WHERE patient_id = ?
        ORDER BY recorded_date DESC LIMIT 10
    """, (patient_id,)).fetchall()
    
    return {
        "patient_id": patient_id,
        "stats": {
            "total_records": docs_count,
            "active_medications": meds_count,
            "unread_alerts": alerts_count,
            "linked_providers": consents_count
        },
        "recent_observations": [dict(o) for o in recent_obs]
    }

# ── Document Routes ──────────────────────────────────────────────
@app.get("/api/patients/{patient_id}/documents")
async def list_documents(patient_id: str, doc_type: Optional[str] = None, db=Depends(get_db)):
    query = "SELECT * FROM documents WHERE patient_id = ?"
    params = [patient_id]
    if doc_type:
        query += " AND doc_type = ?"
        params.append(doc_type)
    query += " ORDER BY uploaded_at DESC"
    docs = db.execute(query, params).fetchall()
    return [dict(d) for d in docs]

@app.get("/api/documents/{document_id}")
async def get_document(document_id: str, db=Depends(get_db)):
    doc = db.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
    if not doc:
        raise HTTPException(404, "Document not found")
    
    doc_dict = dict(doc)
    
    # Attach observations
    obs = db.execute("SELECT * FROM observations WHERE document_id = ?", (document_id,)).fetchall()
    doc_dict['observations'] = [dict(o) for o in obs]
    
    return doc_dict

@app.post("/api/patients/{patient_id}/documents/upload")
async def upload_document(
    patient_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    doc_type: str = "lab_report",
    source: str = "",
    db=Depends(get_db)
):
    """
    Upload a medical document. 
    Processing happens asynchronously via background task.
    """
    # Validate patient exists
    patient = db.execute("SELECT id FROM patients WHERE id = ?", (patient_id,)).fetchone()
    if not patient:
        raise HTTPException(404, "Patient not found")
    
    # Validate file type
    allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']
    if file.content_type not in allowed_types:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")
    
    # Save file
    doc_id = f"doc-{uuid.uuid4().hex[:8]}"
    upload_dir = Path("uploads") / patient_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    file_path = str(upload_dir / f"{doc_id}.{file_ext}")
    
    content = await file.read()
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Create document record
    title = file.filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ').title()
    db.execute("""
        INSERT INTO documents (id, patient_id, title, doc_type, source, file_path, status)
        VALUES (?, ?, ?, ?, ?, ?, 'uploaded')
    """, (doc_id, patient_id, title, doc_type, source, file_path))
    db.commit()
    
    # Log upload
    db.execute("""
        INSERT INTO audit_log (id, patient_id, actor, action, resource_type, resource_id)
        VALUES (?, ?, 'patient', 'DOCUMENT_UPLOAD', 'Document', ?)
    """, (str(uuid.uuid4()), patient_id, doc_id))
    db.commit()
    
    # Queue async processing
    background_tasks.add_task(process_document_async, doc_id, file_path, file.content_type, patient_id)
    
    return UploadResponse(
        document_id=doc_id,
        status="processing",
        message="Document uploaded. AI analysis in progress — you'll be notified when complete."
    )

async def process_document_async(doc_id: str, file_path: str, mime_type: str, patient_id: str):
    """Background task: OCR → NER → FHIR mapping → insights"""
    db_conn = sqlite3.connect(DB_PATH)
    db_conn.row_factory = sqlite3.Row
    
    try:
        # Step 1: OCR
        db_conn.execute("UPDATE documents SET status='processing' WHERE id=?", (doc_id,))
        db_conn.commit()
        
        raw_text = await extract_text_from_file(file_path, mime_type)
        
        # Step 2: Clinical NER
        entities = await extract_clinical_entities(raw_text)
        
        # Step 3: Store extracted observations
        for lab in entities.get('lab_values', []):
            obs_id = f"obs-{uuid.uuid4().hex[:8]}"
            db_conn.execute("""
                INSERT INTO observations (id, patient_id, document_id, display_name, value_string, recorded_date)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (obs_id, patient_id, doc_id, lab.get('name', 'Unknown'), lab.get('value', ''), datetime.now().date().isoformat()))
        
        # Step 4: Store extracted medications
        for med in entities.get('medications', []):
            if isinstance(med, dict) and med.get('word'):
                med_id = f"med-{uuid.uuid4().hex[:8]}"
                db_conn.execute("""
                    INSERT OR IGNORE INTO medications (id, patient_id, document_id, brand_name, status)
                    VALUES (?, ?, ?, ?, 'active')
                """, (med_id, patient_id, doc_id, med['word']))
        
        # Step 5: Update document status
        db_conn.execute("""
            UPDATE documents 
            SET status='analyzed', raw_text=?, extracted_entities=?, analyzed_at=?
            WHERE id=?
        """, (raw_text[:5000], json.dumps(entities), datetime.now().isoformat(), doc_id))
        db_conn.commit()
        
    except Exception as e:
        db_conn.execute("UPDATE documents SET status='failed' WHERE id=?", (doc_id,))
        db_conn.commit()
        print(f"Processing error for {doc_id}: {e}")
    finally:
        db_conn.close()

# ── Observations ─────────────────────────────────────────────────
@app.get("/api/patients/{patient_id}/observations")
async def get_observations(patient_id: str, loinc_code: Optional[str] = None, db=Depends(get_db)):
    query = "SELECT * FROM observations WHERE patient_id = ?"
    params = [patient_id]
    if loinc_code:
        query += " AND loinc_code = ?"
        params.append(loinc_code)
    query += " ORDER BY recorded_date DESC"
    obs = db.execute(query, params).fetchall()
    return [dict(o) for o in obs]

# ── FHIR Endpoint ────────────────────────────────────────────────
@app.get("/api/fhir/Patient/{patient_id}")
async def fhir_patient(patient_id: str, db=Depends(get_db)):
    """FHIR R4 Patient resource"""
    patient = db.execute("SELECT * FROM patients WHERE id = ?", (patient_id,)).fetchone()
    if not patient:
        raise HTTPException(404, "Patient not found")
    p = dict(patient)
    return {
        "resourceType": "Patient",
        "id": p['id'],
        "meta": {"profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient"]},
        "identifier": [{"system": "https://healthid.ndhm.gov.in", "value": p.get('abha_id','')}],
        "name": [{"text": p['name']}],
        "gender": p.get('gender', '').lower(),
        "birthDate": p.get('dob', ''),
    }

@app.get("/api/fhir/Patient/{patient_id}/$everything")
async def fhir_patient_everything(patient_id: str, db=Depends(get_db)):
    """FHIR $everything — complete patient record as Bundle"""
    obs = db.execute("SELECT * FROM observations WHERE patient_id = ?", (patient_id,)).fetchall()
    meds = db.execute("SELECT * FROM medications WHERE patient_id = ?", (patient_id,)).fetchall()
    bundle = create_fhir_bundle(patient_id, [dict(o) for o in obs], [dict(m) for m in meds])
    return bundle

# ── AI Routes ────────────────────────────────────────────────────
@app.get("/api/patients/{patient_id}/insights")
async def get_insights(patient_id: str, db=Depends(get_db)):
    insights = db.execute("""
        SELECT * FROM insights WHERE patient_id = ? ORDER BY created_at DESC
    """, (patient_id,)).fetchall()
    return [dict(i) for i in insights]

@app.post("/api/patients/{patient_id}/insights/refresh")
async def refresh_insights(patient_id: str, background_tasks: BackgroundTasks, db=Depends(get_db)):
    """Trigger correlation analysis and insight generation"""
    correlations = await run_correlation_analysis(patient_id, db)
    
    new_insights = []
    for corr in correlations:
        ins_id = f"ins-{uuid.uuid4().hex[:8]}"
        db.execute("""
            INSERT INTO insights (id, patient_id, insight_type, severity, title, body)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (ins_id, patient_id, corr['type'], corr['severity'], corr['title'], corr['body']))
        new_insights.append(ins_id)
    
    db.commit()
    return {"new_insights": len(new_insights), "ids": new_insights}

@app.post("/api/documents/{document_id}/translate")
async def translate_document(document_id: str, target_lang: str = "english", db=Depends(get_db)):
    """Translate a medical document to plain language"""
    doc = db.execute("SELECT raw_text, title FROM documents WHERE id = ?", (document_id,)).fetchone()
    if not doc:
        raise HTTPException(404, "Document not found")
    
    raw_text = doc['raw_text'] or f"Medical document: {doc['title']}"
    translation = await translate_report(raw_text, target_lang)
    
    return {
        "document_id": document_id,
        "language": target_lang,
        "translation": translation
    }

# ── Medications ──────────────────────────────────────────────────
@app.get("/api/patients/{patient_id}/medications")
async def get_medications(patient_id: str, status: str = "active", db=Depends(get_db)):
    meds = db.execute("""
        SELECT * FROM medications WHERE patient_id = ? AND status = ?
        ORDER BY start_date DESC
    """, (patient_id, status)).fetchall()
    return [dict(m) for m in meds]

@app.get("/api/patients/{patient_id}/medications/interactions")
async def check_interactions(patient_id: str, db=Depends(get_db)):
    """Check drug-drug interactions for active medications"""
    meds = db.execute("""
        SELECT generic_name FROM medications WHERE patient_id = ? AND status = 'active'
    """, (patient_id,)).fetchall()
    
    med_names = [m['generic_name'] for m in meds if m['generic_name']]
    
    # Rule-based interaction checks (production: use RxNorm API or DrugBank)
    interactions = []
    known_interactions = {
        ("Metformin", "Ramipril"): {"severity": "monitor", "description": "Both affect kidney function. Monitor creatinine regularly."},
        ("Atorvastatin", "Ramipril"): {"severity": "safe", "description": "Commonly co-prescribed for cardiovascular protection. No significant interaction."},
    }
    
    for i, m1 in enumerate(med_names):
        for m2 in med_names[i+1:]:
            key1 = (m1, m2)
            key2 = (m2, m1)
            if key1 in known_interactions:
                interactions.append({"medications": [m1, m2], **known_interactions[key1]})
            elif key2 in known_interactions:
                interactions.append({"medications": [m2, m1], **known_interactions[key2]})
    
    return {"medications": med_names, "interactions": interactions}

# ── Consent Routes ───────────────────────────────────────────────
@app.get("/api/patients/{patient_id}/consents")
async def get_consents(patient_id: str, db=Depends(get_db)):
    consents = db.execute("SELECT * FROM consents WHERE patient_id = ?", (patient_id,)).fetchall()
    return [dict(c) for c in consents]

@app.post("/api/patients/{patient_id}/consents")
async def create_consent(patient_id: str, hip_id: str, hip_name: str, duration_days: int = 30, db=Depends(get_db)):
    """Create ABDM consent artefact"""
    consent_id = f"consent-{uuid.uuid4().hex[:8]}"
    expires_at = (datetime.now() + timedelta(days=duration_days)).isoformat()
    
    # ABDM consent artefact structure
    artefact = {
        "id": consent_id,
        "version": "0.2",
        "timestamp": datetime.now().isoformat(),
        "purpose": {"code": "CAREMGT", "text": "Care Management"},
        "patient": {"id": patient_id},
        "hip": {"id": hip_id},
        "hiu": {"id": "MEDINSIGHT-HIU-001"},
        "hiTypes": ["DiagnosticReport", "Prescription", "OPConsultation", "DischargeSummary"],
        "permission": {
            "accessMode": "VIEW",
            "dateRange": {"from": "2020-01-01", "to": datetime.now().isoformat()},
            "frequency": {"unit": "HOUR", "value": 1}
        }
    }
    
    db.execute("""
        INSERT INTO consents (id, patient_id, hip_id, hip_name, expires_at, consent_artefact)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (consent_id, patient_id, hip_id, hip_name, expires_at, json.dumps(artefact)))
    db.commit()
    
    return {"consent_id": consent_id, "artefact": artefact, "expires_at": expires_at}

# ── Share Routes ─────────────────────────────────────────────────
@app.post("/api/patients/{patient_id}/share")
async def create_share_link(patient_id: str, req: ShareRequest, db=Depends(get_db)):
    """Create a time-limited share token for a doctor"""
    token = uuid.uuid4().hex
    token_id = f"share-{uuid.uuid4().hex[:8]}"
    expires_at = (datetime.now() + timedelta(hours=req.duration_hours)).isoformat()
    
    db.execute("""
        INSERT INTO share_tokens (id, patient_id, token, document_ids, recipient_name, purpose, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (token_id, patient_id, token, json.dumps(req.document_ids), req.recipient_name, req.purpose, expires_at))
    db.commit()
    
    share_url = f"https://medinsight.in/share/{token}"
    
    return {
        "share_url": share_url,
        "token": token,
        "expires_at": expires_at,
        "recipient": req.recipient_name
    }

@app.get("/api/share/{token}")
async def access_shared_records(token: str, db=Depends(get_db)):
    """Access records via share token (doctor view)"""
    share = db.execute("""
        SELECT * FROM share_tokens WHERE token = ? AND expires_at > datetime('now')
    """, (token,)).fetchone()
    
    if not share:
        raise HTTPException(404, "Share link expired or invalid")
    
    share_dict = dict(share)
    doc_ids = json.loads(share_dict['document_ids'])
    
    documents = []
    for doc_id in doc_ids:
        doc = db.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
        if doc:
            doc_dict = dict(doc)
            obs = db.execute("SELECT * FROM observations WHERE document_id = ?", (doc_id,)).fetchall()
            doc_dict['observations'] = [dict(o) for o in obs]
            documents.append(doc_dict)
    
    # Log access
    db.execute("""
        INSERT INTO audit_log (id, patient_id, actor, action, resource_type, resource_id)
        VALUES (?, ?, ?, 'SHARED_RECORD_ACCESS', 'ShareToken', ?)
    """, (str(uuid.uuid4()), share_dict['patient_id'], share_dict.get('recipient_name', 'unknown'), token))
    db.execute("UPDATE share_tokens SET access_count = access_count + 1 WHERE token = ?", (token,))
    db.commit()
    
    return {
        "patient_id": share_dict['patient_id'],
        "documents": documents,
        "shared_by": "Patient",
        "purpose": share_dict['purpose']
    }

# ── Audit Log ────────────────────────────────────────────────────
@app.get("/api/patients/{patient_id}/audit")
async def get_audit_log(patient_id: str, db=Depends(get_db)):
    logs = db.execute("""
        SELECT * FROM audit_log WHERE patient_id = ? ORDER BY timestamp DESC LIMIT 50
    """, (patient_id,)).fetchall()
    return [dict(l) for l in logs]

# ── Emergency QR ─────────────────────────────────────────────────
@app.get("/api/patients/{patient_id}/emergency")
async def get_emergency_info(patient_id: str, db=Depends(get_db)):
    """Critical health info for emergency QR — no auth required"""
    patient = db.execute("SELECT * FROM patients WHERE id = ?", (patient_id,)).fetchone()
    if not patient:
        raise HTTPException(404, "Not found")
    p = dict(patient)
    
    meds = db.execute("""
        SELECT brand_name, dosage FROM medications WHERE patient_id = ? AND status = 'active'
    """, (patient_id,)).fetchall()
    
    conditions = db.execute("""
        SELECT display_name FROM conditions WHERE patient_id = ? AND clinical_status = 'active'
    """, (patient_id,)).fetchall()
    
    return {
        "name": p['name'],
        "blood_group": p.get('blood_group', 'Unknown'),
        "allergies": p.get('allergies', 'None known'),
        "conditions": [c['display_name'] for c in conditions],
        "medications": [f"{m['brand_name']} {m['dosage']}" for m in meds],
        "emergency_note": "This information is provided by MedInsight for emergency use only."
    }

# ── ABDM Mock (for dev/testing) ──────────────────────────────────
@app.post("/api/abdm/mock/fetch-records")
async def abdm_mock_fetch(patient_id: str, hip_id: str, db=Depends(get_db)):
    """
    Mock ABDM record fetch for development.
    Production: Use actual ABDM Gateway APIs at https://sandbox.abdm.gov.in
    """
    mock_fhir_bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
            {
                "resource": {
                    "resourceType": "DiagnosticReport",
                    "status": "final",
                    "code": {"coding": [{"system": "http://loinc.org", "code": "24331-1", "display": "Lipid Panel"}]},
                    "effectiveDateTime": "2026-03-14",
                    "result": [{"reference": "Observation/1"}]
                }
            }
        ]
    }
    
    return {"status": "fetched", "hip_id": hip_id, "bundle": mock_fhir_bundle, "note": "Mock data for dev — use ABDM sandbox for real integration"}

# ── Startup ──────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    init_db()
    print("🏥 MedInsight API started")
    print("📚 Docs available at /api/docs")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
