#!/bin/bash

echo "🚀 Railway Backend Deployment Script"
echo "====================================="

echo ""
echo "1. 📦 Installing dependencies..."
cd backend
npm install

echo ""
echo "2. 🔍 Checking for issues..."
if ! node -c server.js; then
    echo "❌ Syntax error in server.js"
    exit 1
fi

echo ""
echo "3. ✅ Backend is ready for Railway deployment!"
echo ""
echo "Next steps:"
echo "1. Go to https://railway.app/dashboard"
echo "2. Click 'New Project' → 'Deploy from GitHub repo'"
echo "3. Select your repository"
echo "4. Set Root Directory to: backend/"
echo "5. Deploy and copy the production URL"
echo ""
echo "6. Update the frontend API_BASE URL with the new Railway URL"
echo ""
echo "Current API_BASE in app.js: https://blackfamily-production.up.railway.app/api"
echo "You'll need to update this with your new Railway URL"
