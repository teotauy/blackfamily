#!/bin/bash

echo "🚀 Vercel Frontend Deployment Script"
echo "===================================="

echo ""
echo "1. 🔍 Checking frontend files..."
if [ ! -f "index.html" ]; then
    echo "❌ index.html not found"
    exit 1
fi

if [ ! -f "js/app.js" ]; then
    echo "❌ js/app.js not found"
    exit 1
fi

if [ ! -f "css/style.css" ]; then
    echo "❌ css/style.css not found"
    exit 1
fi

echo "✅ All frontend files found"

echo ""
echo "2. 📝 Current API configuration:"
grep -n "API_BASE" js/app.js

echo ""
echo "3. ✅ Frontend is ready for Vercel deployment!"
echo ""
echo "Next steps:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Click 'Add New Project'"
echo "3. Import your GitHub repository"
echo "4. Set Root Directory to: ./ (root of repo)"
echo "5. Deploy"
echo ""
echo "6. After Railway backend is deployed, update the API_BASE URL in js/app.js"
echo "   with your new Railway backend URL"
echo ""
echo "Current API_BASE: https://blackfamily-production.up.railway.app/api"
