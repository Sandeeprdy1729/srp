# AarogyaKosha - Complete Setup & Startup Guide

## Project Status: 90% Ready for Development

### ✅ What's Been Done (Phase 0)
- [x] Rebranded from MedInsight → AarogyaKosha (aarōgya kōśa = health vault)
- [x] Color scheme updated: terracotta (#c96442) → medical blue (#2563eb)
- [x] Environment configuration (.env files created)
- [x] Dependencies installed:
  - Backend: FastAPI, SQLAlchemy, PostgreSQL, Redis, Pydantic, JWT, etc.
  - Frontend: React 18, TypeScript, Vite, Tailwind, Zustand
- [x] Docker services running (PostgreSQL, Redis)
- [x] Database structure validated

### 🚀 Quick Start (2 minutes)

#### Prerequisites
- Docker Desktop running (for PostgreSQL)
- Python 3.13 installed
- Node.js 18+ installed

#### Option 1: Two Terminal Windows (Recommended)

**Terminal 1 - Backend:**
```bash
cd /Users/sandeepreddy/Downloads/srp_project/aarogyakosha/backend
unset DEBUG  # IMPORTANT: This system variable must be unset
python3.13 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd /Users/sandeepreddy/Downloads/srp_project/aarogyakosha/frontend
npm run dev
```

#### Option 2: Using the Start Script
```bash
bash /Users/sandeepreddy/Downloads/srp_project/start-dev.sh
```

### 📍 Access Points
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Database**: localhost:5432 (PostgreSQL)

### 📋 Environment Variables

**Backend .env** (already configured):
```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/aarogyakosha
DEBUG=false
HOST=127.0.0.1
PORT=8000
```

**Frontend .env.local** (already configured):
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_DEBUG=true
```

### ⚙️ Key Fixes Applied

1. **Python 3.13 Compatibility**
   - SQLAlchemy 2.0.25 (known issues with 2.1.0 on Python 3.13)
   - Downgraded from SQLAlchemy 2.1.0 to stable 2.0.25

2. **Environment Variable Conflict**
   - System has `DEBUG=WARN` which conflicts with Pydantic's DEBUG field
   - Solution: `unset DEBUG` before running backend

3. **Database Dialect**
   - Using PostgreSQL instead of SQLite (UUID type compatibility)
   - SQLAlchemy 2.0.25 specific configurations applied

### 📁 Project Structure
```
aarogyakosha/
├── backend/
│   ├── app/
│   │   ├── api/v1/         # 10 endpoint routers
│   │   ├── core/           # Config, security
│   │   ├── db/             # Database, Redis
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── main.py             # FastAPI app
│   ├── requirements.txt    # Dependencies
│   └── .env                # Configuration
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Route pages (10+ ready)
│   │   ├── services/       # API client
│   │   ├── store/          # Zustand state
│   │   └── types/          # TypeScript types
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.local          # Configuration
├── docker-compose.yml      # All services
└── .env.example            # Template

```

### 🔧 Troubleshooting

**Backend won't start:**
1. Check `unset DEBUG` - system variable conflict
2. Verify PostgreSQL is running: `docker-compose ps postgres`
3. Check logs: `cat /tmp/backend.log`

**Frontend npm errors:**
1. Clear node_modules: `rm -rf node_modules package-lock.json`
2. Reinstall: `npm install`
3. dev server won't start on 5173: Check if port is in use

**Database connection refused:**
1. Start Docker: `docker desktop` or `open -a Docker`
2. Start PostgreSQL: `cd aarogyakosha && docker-compose up -d postgres`
3. Verify: `docker-compose exec -T postgres pg_isready -U postgres`

### 📊 What's Implemented

**Backend (90% ready)**
- ✅ FastAPI framework with lifespan management
- ✅ 10 endpoint routers (auth, users, patients, documents, upload, sharing, family, consent, ai, dashboard)
- ✅ SQLAlchemy ORM with PostgreSQL
- ✅ JWT authentication with refresh tokens
- ✅ Redis cache integration (configured)
- ✅ MinIO object storage (configured)
- ✅ Database models for: User, Patient, Document, Observation, Medication, Consent, etc.
- ⚠️ AI endpoints need implementation (empty placeholders)

**Frontend (85% ready)**
- ✅ React Router with protected routes
- ✅ Zustand state management with persistence
- ✅ Axios API client with interceptors
- ✅ TailwindCSS styling
- ✅ Page structure for: Dashboard, Documents, Upload, Sharing, Family, Consent, Profile, etc.
- ⚠️ Component implementations need completion (pages render but many are stubs)

### 🎯 Next Steps (Phase 1.3+)

1. **Frontend UI Completion** (3-4 days)
   - Fill in component implementations
   - Add forms and validation
   - Connect pages to backend API
   - Test authentication flow

2. **AI Features** (5-7 days)
   - Implement clinical note translator
   - Data correlation engine
   - Proactive alerts system

3. **Testing & Deployment** (3-4 days)
   - Unit tests for backend
   - End-to-end tests
   - Docker deployment setup

### 📞 Quick Commands

```bash
# Start/stop Docker services
docker-compose up -d postgres redis
docker-compose down

# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies
npm install

# Start backend (with DEBUG unset)
unset DEBUG && python3.13 -m uvicorn main:app --reload

# Start frontend
npm run dev

# Check service health
curl http://localhost:8000/health
curl http://localhost:5173

# View logs
tail -f /tmp/backend.log
tail -f /tmp/frontend.log
```

### 🗂️ File Locations

- Project root: `/Users/sandeepreddy/Downloads/srp_project/`
- Backend: `/Users/sandeepreddy/Downloads/srp_project/aarogyakosha/backend/`
- Frontend: `/Users/sandeepreddy/Downloads/srp_project/aarogyakosha/frontend/`
- HTML Prototype: `/Users/sandeepreddy/Downloads/srp_project/aarogyakosha-app.html`
- Main README: `/Users/sandeepreddy/Downloads/srp_project/README.md`

---

**Status**: Phase 0 ✅ Complete | Phase 1 Ready to Start  
**Created**: March 30, 2026  
**Last Updated**: Now
