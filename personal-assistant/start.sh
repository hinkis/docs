#!/bin/bash

echo "🚀 מפעיל את המזכיר האישי..."
echo ""

# הרג תהליכים קודמים אם יש
pkill -f "tsx src/index.ts" 2>/dev/null
pkill -f "vite" 2>/dev/null

# הפעלת Backend
echo "📦 מפעיל Backend..."
cd "$(dirname "$0")/backend"
npm run dev &
BACKEND_PID=$!

# המתנה ל-Backend
sleep 3

# הפעלת Frontend
echo "🎨 מפעיל Frontend..."
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!

# המתנה ל-Frontend
sleep 3

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║   ✅ המזכיר האישי פעיל!                                ║"
echo "║                                                        ║"
echo "║   🌐 פתח בדפדפן: http://localhost:5173                 ║"
echo "║                                                        ║"
echo "║   לעצירה: לחץ Ctrl+C                                   ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# המתנה לסיום
wait
