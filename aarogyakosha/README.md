# AarogyaKosha - Open Source Personal Health Record System

## 100% Free & Open Source Stack

### Backend Technologies
- **Framework**: Python FastAPI 0.109+
- **Database**: PostgreSQL 16 (Open Source)
- **FHIR Server**: HAPI FHIR (Open Source)
- **Object Storage**: MinIO (S3-compatible, Open Source)
- **Cache**: Redis (Open Source)
- **Search**: Meilisearch (Open Source)
- **AI/NLP**: BioBERT, Transformers (HuggingFace, Open Source)
- **Authentication**: JWT + OAuth2 (Open Standard)

### Frontend Technologies
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

### Infrastructure (Optional - All Open Source)
- **Container**: Docker + Docker Compose
- **Orchestration**: Kubernetes (or local Docker)
- **Reverse Proxy**: Nginx
- **Monitoring**: Prometheus + Grafana

## Quick Start

```bash
# Start all services with Docker
cd aarogyakosha
docker-compose up -d

# Or run locally
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
cd frontend && npm install && npm run dev
```

## Features
- Document upload (PDF, images, scanned reports)
- FHIR R4 compliant data storage
- Clinical NLP (extract entities from medical text)
- ABDM integration ready
- Patient consent management
- Family access sharing
- Emergency QR code
- Multi-language support (EN/HI)

## License
MIT License
