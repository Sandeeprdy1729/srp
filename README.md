# MedInsight — AI-Powered Personal Medical Report Library

> Developed by: Vipin, Siddartha, Sandeep | GRIET AIML Department  
> Guide: Mrunalini, Asst. Professor

A secure, patient-owned Medical Report Library that lets users upload any medical files (PDFs, scans, handwritten reports) and automatically connects via FHIR to pull structured records from hospitals — powered entirely by **free and open-source tools**.

---

## What It Does

| Feature | Description |
|---|---|
| **Universal Upload** | PDFs, JPGs, PNGs, handwritten prescriptions — AI extracts everything |
| **Report Translator** | Complex doctor notes → plain Hindi/English with action items |
| **Data Correlation Engine** | Finds patterns across labs, medications, timeline (e.g., "LDL dropped 28% after statin") |
| **Proactive Alerts** | ICMR/WHO guideline-based care gap detection and notifications |
| **ABDM/FHIR Integration** | Pulls structured records from hospitals via ABHA ID |
| **Duplicate Detection** | Catches repeat tests, saves ₹800+ per duplicate |
| **Consent Management** | Granular patient control over who sees what |
| **Secure Share Links** | Time-limited links for doctor consultations |
| **Emergency QR Card** | Critical health info accessible without login |
| **Medication Reconciliation** | Drug interaction checking across all prescriptions |

---

## Tech Stack (100% Free & Open Source)

### Backend
| Component | Technology | Why |
|---|---|---|
| Web Framework | **FastAPI** (Python) | Async, auto-docs, fast |
| Database | **SQLite** (dev) → **PostgreSQL** (prod) | Zero cost, reliable |
| FHIR Server | **HAPI FHIR** (Java) or Python `fhir.resources` | ABDM IG v6.5 compliant |
| OCR | **Tesseract OCR** + pytesseract | Free, supports Hindi/Telugu |
| Clinical NLP | **Bio_ClinicalBERT** (Hugging Face) | Trained on medical notes |
| NER | **d4data/biomedical-ner-all** (Hugging Face) | Free, no API key |
| LLM Translation | **Ollama + Llama-3.1-8B** (local) | Runs on your machine |
| Vector Search | **pgvector** + sentence-transformers | Free RAG embeddings |
| Agentic Workflows | **LangChain** | Free orchestration |
| QR Codes | **qrcode** (Python) | Free |
| Auth | **python-jose** JWT + passlib bcrypt | Free |

### Frontend
| Component | Technology |
|---|---|
| UI | Vanilla HTML/CSS/JS (zero dependencies) |
| Fonts | Google Fonts — Instrument Serif + Geist |
| Charts | CSS-only progress bars |

### Infrastructure (all free tiers)
| Component | Option |
|---|---|
| Deployment | Railway.app / Render.com / Fly.io (free tier) |
| FHIR Server | HAPI FHIR self-hosted on Railway |
| Storage | Cloudflare R2 (free) or local filesystem |
| CI/CD | GitHub Actions (free) |

---

## Project Structure

```
medinsight/
├── frontend/
│   └── index.html              # Complete UI (single file, no build needed)
├── backend/
│   └── main.py                 # Complete FastAPI backend
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── .env.example                # Environment variables
├── docker-compose.yml          # Docker setup
├── Dockerfile                  # Container build
└── tests/
    └── test_api.py             # API tests
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourteam/medinsight
cd medinsight

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install Python dependencies
pip install fastapi uvicorn python-multipart python-jose passlib httpx python-dotenv
```

### 2. Install System Dependencies (OCR)

```bash
# Ubuntu/Debian
sudo apt-get install -y tesseract-ocr tesseract-ocr-hin tesseract-ocr-tel poppler-utils

# macOS
brew install tesseract tesseract-lang poppler

# Windows: download from https://github.com/UB-Mannheim/tesseract/wiki
```

### 3. Install Ollama (Local LLM — for translation feature)

```bash
# Linux/macOS
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.1:8b    # ~4.7GB, runs without GPU
# OR smaller model:
ollama pull mistral:7b
```

### 4. Run the App

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Open **http://localhost:8000** — the full app loads immediately.  
API docs at **http://localhost:8000/api/docs**

---

## API Reference

### Core Endpoints

```
GET    /api/patients/{id}/summary          → Health stats overview
GET    /api/patients/{id}/documents        → List all records
POST   /api/patients/{id}/documents/upload → Upload new document
GET    /api/documents/{id}                 → Single document with observations
GET    /api/patients/{id}/observations     → Lab values (FHIR Observations)
GET    /api/patients/{id}/medications      → Active medications
GET    /api/patients/{id}/medications/interactions → Drug interaction check
GET    /api/patients/{id}/insights         → AI-generated insights
POST   /api/patients/{id}/insights/refresh → Run correlation analysis
POST   /api/documents/{id}/translate       → Translate to plain language
GET    /api/patients/{id}/consents         → ABDM consent records
POST   /api/patients/{id}/share            → Create share link
GET    /api/share/{token}                  → Access shared records
GET    /api/patients/{id}/emergency        → Emergency QR info
GET    /api/fhir/Patient/{id}/$everything  → Full FHIR Bundle
GET    /api/patients/{id}/audit            → Audit log
```

---

## FHIR & ABDM Integration

### ABDM FHIR Implementation Guide v6.5
Profile: `https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient`

### FHIR Resources Used
- `Patient` — ABHA-linked patient identity
- `Observation` — Lab values (LOINC-coded)
- `MedicationStatement` — Prescriptions
- `Condition` — Diagnoses (ICD-10/ICD-11)
- `DiagnosticReport` — Complete lab reports
- `DocumentReference` — Uploaded files
- `Binary` — Raw file content
- `Consent` — ABDM consent artefacts
- `AuditEvent` — Every access logged

### ABDM Gateway Integration (Production)
```python
# Use ABDM sandbox: https://sandbox.abdm.gov.in
ABDM_BASE_URL = "https://dev.abdm.gov.in/gateway"

# 1. Register as HIU: https://devportal.abdm.gov.in
# 2. Get client_id and client_secret
# 3. Follow: /api/abdm/mock/fetch-records for structure
```

---

## AI Pipeline

```
Uploaded File
     ↓
Tesseract OCR (Hindi + English)
     ↓
Bio_ClinicalBERT NER
(drugs, diagnoses, lab values)
     ↓
FHIR Resource Mapping
(Observation, MedicationStatement, Condition)
     ↓
Ollama LLM Translation
(plain language + action items)
     ↓
Correlation Engine
(trends, duplicates, care gaps)
     ↓
Patient Timeline + Insights
```

---

## Deployment (Free)

### Railway.app (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Docker
```bash
docker-compose up --build
```

### Environment Variables
```env
DATABASE_URL=sqlite:///medinsight.db
SECRET_KEY=your-secret-key-change-in-prod
ABDM_CLIENT_ID=your-abdm-client-id
ABDM_CLIENT_SECRET=your-abdm-client-secret
OLLAMA_BASE_URL=http://localhost:11434
UPLOAD_DIR=./uploads
```

---

## References

1. ABDM FHIR IG v6.5 — https://nrces.in/ndhm/fhir/r4/index.html
2. ABDM Sandbox — https://sandbox.abdm.gov.in/docs/
3. ABHA — https://abdm.gov.in/
4. HL7 FHIR R4 — https://hl7.org/fhir/R4/
5. Practo Drive — https://www.practo.com/drive
6. Epic MyChart — https://www.mychart.org/
7. Bio_ClinicalBERT — https://huggingface.co/emilyalsentzer/Bio_ClinicalBERT
8. Tapuria A et al. (2021) — https://pubmed.ncbi.nlm.nih.gov/33840342/
9. Fennelly O et al. (2024) — https://pubmed.ncbi.nlm.nih.gov/38266425/
10. Tabari P et al. (2024) — https://pubmed.ncbi.nlm.nih.gov/39316433/

---

## Team

| Name | Roll No | Role |
|---|---|---|
| Vipin | 24241A66A8 | Backend + FHIR Integration |
| Siddartha | 24241A6692 | Frontend + UI/UX |
| Sandeep | 24241A66AQ | AI/ML Pipeline + Correlations |

Guide: **Mrunalini**, Asst. Professor, GRIET AIML Department
