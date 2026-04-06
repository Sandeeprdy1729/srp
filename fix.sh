#!/bin/bash
# AarogyaKosha - Quick Fix Script

echo "🔧 AarogyaKosha Quick Fix"
echo "========================="

# Kill all processes
echo "1️⃣  Killing processes on ports 8000 & 5173..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:5174 | xargs kill -9 2>/dev/null || true

sleep 1

# Rebuild frontend (fixes styling issues)
echo "2️⃣  Rebuilding frontend (fixes styling)..."
cd /Users/sandeepreddy/Downloads/srp_project/aarogyakosha/frontend
npm run build > /dev/null 2>&1

# Start services
echo "3️⃣  Starting services..."
cd /Users/sandeepreddy/Downloads/srp_project/aarogyakosha/backend
unset DEBUG
/Users/sandeepreddy/Downloads/srp_project/venv/bin/python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000 > /tmp/backend.log 2>&1 &
sleep 2
cd /Users/sandeepreddy/Downloads/srp_project/aarogyakosha/frontend
npm run dev > /tmp/frontend.log 2>&1 &

sleep 3

echo ""
echo "✅ Done! Services restarted"
echo ""
echo "   🌐 Frontend:  http://localhost:5173"
echo "   📡 Backend:   http://localhost:8000"
echo "========================="
