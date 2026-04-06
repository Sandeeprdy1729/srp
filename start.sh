#!/bin/bash
# AarogyaKosha - Quick Start Script

echo "🏥 Starting AarogyaKosha..."
echo "=============================="

# Kill existing processes
echo "🔄 Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Start Backend
echo "🚀 Starting Backend (port 8000)..."
cd /Users/sandeepreddy/Downloads/srp_project/aarogyakosha/backend
unset DEBUG
/Users/sandeepreddy/Downloads/srp_project/venv/bin/python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

sleep 2

# Start Frontend
echo "⚛️  Starting Frontend (port 5173)..."
cd /Users/sandeepreddy/Downloads/srp_project/aarogyakosha/frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 3

echo ""
echo "=============================="
echo "✅ AarogyaKosha is running!"
echo ""
echo "   🌐 Frontend:  http://localhost:5173"
echo "   📡 Backend:   http://localhost:8000"
echo "   📚 API Docs:  http://localhost:8000/docs"
echo ""
echo "   PID Backend:  $BACKEND_PID"
echo "   PID Frontend: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop"
echo "=============================="

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '✅ Stopped'; exit" INT TERM

wait
