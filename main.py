from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import uvicorn, os, json, uuid, sqlite3, asyncio
from datetime import datetime, timedelta
from pathlib import Path

app = FastAPI(title="AarogyaKosha API", version="1.0.0", docs_url="/api/docs")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

FRONTEND_HTML = Path(__file__).parent / "aarogyakosha-app.html"
DB_PATH = Path(__file__).parent / "aarogyakosha.db"

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try: yield conn
    finally: conn.close()

def init_db():
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, abha_id TEXT UNIQUE, name TEXT NOT NULL, dob TEXT, gender TEXT, blood_group TEXT, allergies TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, title TEXT NOT NULL, doc_type TEXT NOT NULL, source TEXT, file_path TEXT, fhir_bundle TEXT, status TEXT DEFAULT 'uploaded', raw_text TEXT, extracted_entities TEXT, uploaded_at TEXT DEFAULT (datetime('now')), analyzed_at TEXT);
    CREATE TABLE IF NOT EXISTS observations (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, document_id TEXT, loinc_code TEXT, display_name TEXT NOT NULL, value_quantity REAL, value_unit TEXT, reference_range_low REAL, reference_range_high REAL, interpretation TEXT, recorded_date TEXT);
    CREATE TABLE IF NOT EXISTS medications (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, document_id TEXT, brand_name TEXT, generic_name TEXT, dosage TEXT, frequency TEXT, start_date TEXT, status TEXT DEFAULT 'active', prescribed_by TEXT);
    CREATE TABLE IF NOT EXISTS insights (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, insight_type TEXT, severity TEXT, title TEXT NOT NULL, body TEXT, guideline_source TEXT, is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS consents (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, hip_id TEXT NOT NULL, hip_name TEXT, status TEXT DEFAULT 'active', granted_at TEXT DEFAULT (datetime('now')), expires_at TEXT, consent_artefact TEXT);
    CREATE TABLE IF NOT EXISTS share_tokens (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, token TEXT UNIQUE NOT NULL, document_ids TEXT, recipient_name TEXT, purpose TEXT, expires_at TEXT NOT NULL, access_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, patient_id TEXT, actor TEXT NOT NULL, action TEXT NOT NULL, resource_type TEXT, resource_id TEXT, timestamp TEXT DEFAULT (datetime('now')));
    """)
    c.execute("INSERT OR IGNORE INTO patients (id,abha_id,name,dob,gender,blood_group,allergies) VALUES (?,?,?,?,?,?,?)", ('patient-001','1234-5678-9012','Sandeep Reddy','2004-03-15','Male','B+','Penicillin'))
    demo_docs = [('doc-001','patient-001','HbA1c & Lipid Panel','lab_report','Apollo Hyderabad / Thyrocare','analyzed','2026-03-14'),('doc-002','patient-001','Dr. Sharma Prescription','prescription','Apollo Hyderabad','analyzed','2026-03-10'),('doc-003','patient-001','Chest X-Ray','scan','Yashoda Hospital','analyzed','2026-03-08'),('doc-004','patient-001','Discharge Summary','discharge','CARE Hospitals','processing','2026-02-02'),('doc-005','patient-001','ECG Report','ecg','Cardiology OPD','analyzed','2026-01-18')]
    for d in demo_docs: c.execute("INSERT OR IGNORE INTO documents (id,patient_id,title,doc_type,source,status,uploaded_at) VALUES (?,?,?,?,?,?,?)", d)
    demo_obs = [('obs-001','patient-001','doc-001','4548-4','HbA1c',6.2,'%',4.0,5.6,'high','2026-03-14'),('obs-002','patient-001','doc-001','2089-1','LDL Cholesterol',98.0,'mg/dL',None,100.0,'normal','2026-03-14'),('obs-003','patient-001','doc-001','2085-9','HDL Cholesterol',52.0,'mg/dL',40.0,None,'normal','2026-03-14'),('obs-004','patient-001','doc-001','2571-8','Triglycerides',142.0,'mg/dL',None,150.0,'normal','2026-03-14'),('obs-005','patient-001','doc-001','14771-0','Fasting Blood Sugar',108.0,'mg/dL',70.0,100.0,'high','2026-03-14')]
    for o in demo_obs: c.execute("INSERT OR IGNORE INTO observations (id,patient_id,document_id,loinc_code,display_name,value_quantity,value_unit,reference_range_low,reference_range_high,interpretation,recorded_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)", o)
    demo_meds = [('med-001','patient-001','doc-002','Atorvastatin','Atorvastatin','40mg','Once daily at night','2025-12-20','active','Dr. Sharma'),('med-002','patient-001','doc-002','Metformin','Metformin HCl','500mg','Twice daily with meals','2025-08-10','active','Dr. Sharma'),('med-003','patient-001','doc-002','Ramipril','Ramipril','5mg','Once daily in morning','2025-11-10','active','Dr. Reddy')]
    for m in demo_meds: c.execute("INSERT OR IGNORE INTO medications (id,patient_id,document_id,brand_name,generic_name,dosage,frequency,start_date,status,prescribed_by) VALUES (?,?,?,?,?,?,?,?,?,?)", m)
    demo_insights = [('ins-001','patient-001','correlation','info','LDL improved 28% after Atorvastatin','LDL dropped from 138 to 98 mg/dL within 90 days of starting statin therapy.','ICMR Lipid Guidelines 2024'),('ins-002','patient-001','alert','medium','HbA1c rising — pre-diabetic range','3 consecutive readings trending upward over 6 months. Now at 6.2%.','ICMR Diabetes Guidelines 2024'),('ins-003','patient-001','duplicate','low','Duplicate HbA1c test detected','HbA1c ordered by two different doctors within 12 days. Estimated saving: Rs.800.',None),('ins-004','patient-001','care_gap','high','Kidney function test overdue','On Metformin for 8 months. ICMR recommends creatinine + eGFR every 6 months.','ICMR Diabetes Guidelines 2024')]
    for ins in demo_insights: c.execute("INSERT OR IGNORE INTO insights (id,patient_id,insight_type,severity,title,body,guideline_source) VALUES (?,?,?,?,?,?,?)", ins)
    conn.commit(); conn.close()
    print("Database ready")

@app.get("/")
async def serve_frontend():
    if FRONTEND_HTML.exists():
        return FileResponse(str(FRONTEND_HTML), media_type="text/html")
    return {"message": "MedInsight API running", "docs": "/api/docs"}

@app.get("/api/health")
async def health(): return {"status": "healthy", "version": "1.0.0"}

@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: str, db=Depends(get_db)):
    p = db.execute("SELECT * FROM patients WHERE id=?", (patient_id,)).fetchone()
    if not p: raise HTTPException(404, "Not found")
    return dict(p)

@app.get("/api/patients/{patient_id}/summary")
async def summary(patient_id: str, db=Depends(get_db)):
    docs = db.execute("SELECT COUNT(*) FROM documents WHERE patient_id=?", (patient_id,)).fetchone()[0]
    meds = db.execute("SELECT COUNT(*) FROM medications WHERE patient_id=? AND status='active'", (patient_id,)).fetchone()[0]
    alerts = db.execute("SELECT COUNT(*) FROM insights WHERE patient_id=? AND is_read=0", (patient_id,)).fetchone()[0]
    consents = db.execute("SELECT COUNT(*) FROM consents WHERE patient_id=? AND status='active'", (patient_id,)).fetchone()[0]
    return {"stats": {"total_records": docs, "active_medications": meds, "unread_alerts": alerts, "linked_providers": consents}}

@app.get("/api/patients/{patient_id}/documents")
async def list_docs(patient_id: str, db=Depends(get_db)):
    docs = db.execute("SELECT * FROM documents WHERE patient_id=? ORDER BY uploaded_at DESC", (patient_id,)).fetchall()
    return [dict(d) for d in docs]

@app.post("/api/patients/{patient_id}/documents/upload")
async def upload_doc(patient_id: str, background_tasks: BackgroundTasks, file: UploadFile = File(...), doc_type: str = "lab_report", source: str = "", db=Depends(get_db)):
    doc_id = f"doc-{uuid.uuid4().hex[:8]}"
    upload_dir = Path("uploads") / patient_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    file_path = str(upload_dir / f"{doc_id}.{ext}")
    content = await file.read()
    with open(file_path, 'wb') as f: f.write(content)
    title = file.filename.rsplit('.', 1)[0].replace('_',' ').replace('-',' ').title()
    db.execute("INSERT INTO documents (id,patient_id,title,doc_type,source,file_path,status) VALUES (?,?,?,?,?,?,'uploaded')", (doc_id, patient_id, title, doc_type, source, file_path))
    db.execute("INSERT INTO audit_log (id,patient_id,actor,action,resource_type,resource_id) VALUES (?,?,'patient','UPLOAD','Document',?)", (str(uuid.uuid4()), patient_id, doc_id))
    db.commit()
    return {"document_id": doc_id, "status": "processing", "message": "Uploaded successfully. AI analysis starting."}

@app.get("/api/patients/{patient_id}/observations")
async def get_obs(patient_id: str, db=Depends(get_db)):
    obs = db.execute("SELECT * FROM observations WHERE patient_id=? ORDER BY recorded_date DESC", (patient_id,)).fetchall()
    return [dict(o) for o in obs]

@app.get("/api/patients/{patient_id}/medications")
async def get_meds(patient_id: str, db=Depends(get_db)):
    meds = db.execute("SELECT * FROM medications WHERE patient_id=? AND status='active' ORDER BY start_date DESC", (patient_id,)).fetchall()
    return [dict(m) for m in meds]

@app.get("/api/patients/{patient_id}/insights")
async def get_insights(patient_id: str, db=Depends(get_db)):
    ins = db.execute("SELECT * FROM insights WHERE patient_id=? ORDER BY created_at DESC", (patient_id,)).fetchall()
    return [dict(i) for i in ins]

@app.get("/api/patients/{patient_id}/consents")
async def get_consents(patient_id: str, db=Depends(get_db)):
    c = db.execute("SELECT * FROM consents WHERE patient_id=?", (patient_id,)).fetchall()
    return [dict(i) for i in c]

@app.get("/api/patients/{patient_id}/audit")
async def get_audit(patient_id: str, db=Depends(get_db)):
    logs = db.execute("SELECT * FROM audit_log WHERE patient_id=? ORDER BY timestamp DESC LIMIT 50", (patient_id,)).fetchall()
    return [dict(l) for l in logs]

@app.get("/api/patients/{patient_id}/emergency")
async def emergency(patient_id: str, db=Depends(get_db)):
    p = db.execute("SELECT * FROM patients WHERE id=?", (patient_id,)).fetchone()
    if not p: raise HTTPException(404)
    p = dict(p)
    meds = db.execute("SELECT brand_name, dosage FROM medications WHERE patient_id=? AND status='active'", (patient_id,)).fetchall()
    return {"name": p['name'], "blood_group": p.get('blood_group'), "allergies": p.get('allergies'), "medications": [f"{m['brand_name']} {m['dosage']}" for m in meds]}

class ShareRequest(BaseModel):
    recipient_name: str
    document_ids: List[str]
    duration_hours: int = 24
    purpose: str = "Medical consultation"

@app.post("/api/patients/{patient_id}/share")
async def create_share(patient_id: str, req: ShareRequest, db=Depends(get_db)):
    token = uuid.uuid4().hex
    expires_at = (datetime.now() + timedelta(hours=req.duration_hours)).isoformat()
    db.execute("INSERT INTO share_tokens (id,patient_id,token,document_ids,recipient_name,purpose,expires_at) VALUES (?,?,?,?,?,?,?)",
               (f"share-{uuid.uuid4().hex[:8]}", patient_id, token, json.dumps(req.document_ids), req.recipient_name, req.purpose, expires_at))
    db.commit()
    return {"share_url": f"https://medinsight.in/share/{token}", "token": token, "expires_at": expires_at}

@app.get("/api/share/{token}")
async def get_share(token: str, db=Depends(get_db)):
    s = db.execute("SELECT * FROM share_tokens WHERE token=? AND expires_at > datetime('now')", (token,)).fetchone()
    if not s: raise HTTPException(404, "Link expired")
    return {"status": "valid", "data": dict(s)}

@app.get("/api/fhir/Patient/{patient_id}")
async def fhir_patient(patient_id: str, db=Depends(get_db)):
    p = db.execute("SELECT * FROM patients WHERE id=?", (patient_id,)).fetchone()
    if not p: raise HTTPException(404)
    p = dict(p)
    return {"resourceType": "Patient", "id": p['id'], "meta": {"profile": ["https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient"]}, "identifier": [{"system": "https://healthid.ndhm.gov.in", "value": p.get('abha_id','')}], "name": [{"text": p['name']}], "gender": p.get('gender','').lower(), "birthDate": p.get('dob','')}

@app.on_event("startup")
async def startup(): init_db(); print("MedInsight running at http://localhost:8000")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)