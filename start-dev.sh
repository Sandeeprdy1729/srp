#!/bin/bash
# AarogyaKosha Development Server Start Script

echo "======================================="
echo "🚀 AarogyaKosha Development Server"
echo "======================================="
echo ""

# Kill any existing processes on ports 8000 or 5173
echo "🧹 Cleaning up old processes..."
lsof -i :8000 -t | xargs kill -9 2>/dev/null || true
lsof -i :5173 -t | xargs kill -9 2>/dev/null || true
sleep 2

# Remove DEBUG environment variable that conflicts with Pydantic
unset DEBUG

echo "✅ Starting services..."
echo ""

# Start Backend
echo "📦 Starting FastAPI Backend on http://localhost:8000..."
cd /Users/sandeepreddy/Downloads/srp_project/aarogyakosha/backend
python3.13 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 5

# Start Frontend
echo "🎨 Starting React Frontend on http://localhost:5173..."
cd /Users/sandeepreddy/Downloads/srp_project/aarogyakosha/frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "======================================="
echo "✅ Services starting..."
echo "======================================="
echo ""
echo "📍 Backend: http://localhost:8000"
echo "📍 Frontend: http://localhost:5173"
echo "📍 API Docs: http://localhost:8000/docs"
echo ""
echo "Logs:"
echo "  Backend: tail -f /tmp/backend.log"
echo "  Frontend: tail -f /tmp/frontend.log"
echo ""
echo "To stop: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Wait for both processes
wait
