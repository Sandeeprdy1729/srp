#!/bin/bash
# AarogyaKosha - Development Start Script

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/aarogyakosha/backend"
FRONTEND_DIR="$PROJECT_DIR/aarogyakosha/frontend"

echo "🏥 Starting AarogyaKosha Development Environment"
echo "================================================"

# Unset DEBUG to avoid Pydantic conflict with system env
unset DEBUG

# Kill any existing processes on our ports
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# 1. Start Docker services
echo ""
echo "📦 Starting Docker services..."
cd "$PROJECT_DIR/aarogyakosha"
if ! docker info >/dev/null 2>&1; then
  echo "   ⚠️  Docker is not running. Please start Docker Desktop first."
  echo "   ⚠️  Continuing without database services..."
else
  docker compose up -d postgres redis 2>/dev/null || docker-compose up -d postgres redis 2>/dev/null || true
  echo "   ✓ PostgreSQL (port 5432)"
  echo "   ✓ Redis (port 6379)"

  # Wait for PostgreSQL to be healthy
  echo "   ⏳ Waiting for PostgreSQL..."
  for i in $(seq 1 15); do
    if docker exec aarogyakosha-postgres pg_isready -U postgres -q 2>/dev/null; then
      echo "   ✓ PostgreSQL ready"
      break
    fi
    sleep 1
  done
fi

# 2. Start Backend
echo ""
echo "🐍 Starting Backend (FastAPI)..."
cd "$BACKEND_DIR"
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload > /tmp/aarogyakosha-backend.log 2>&1 &
BACKEND_PID=$!
echo "   ✓ Backend running at http://127.0.0.1:8000 (PID: $BACKEND_PID)"
echo "   ✓ API docs at http://127.0.0.1:8000/docs"

# 3. Start Frontend
echo ""
echo "⚛️  Starting Frontend (Vite + React)..."
cd "$FRONTEND_DIR"
npx vite --host 127.0.0.1 --port 5173 > /tmp/aarogyakosha-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   ✓ Frontend running at http://127.0.0.1:5173 (PID: $FRONTEND_PID)"

echo ""
echo "================================================"
echo "🚀 AarogyaKosha is running!"
echo ""
echo "   Frontend:  http://127.0.0.1:5173"
echo "   Backend:   http://127.0.0.1:8000"
echo "   API Docs:  http://127.0.0.1:8000/docs"
echo ""
echo "   Logs: /tmp/aarogyakosha-backend.log"
echo "         /tmp/aarogyakosha-frontend.log"
echo ""
echo "Press Ctrl+C to stop all services"

# Trap to kill background processes
cleanup() {
  echo ""
  echo "Stopping services..."
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  echo "✓ Stopped"
}

trap cleanup EXIT INT TERM

# Wait for either process
wait
