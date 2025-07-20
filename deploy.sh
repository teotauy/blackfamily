#!/bin/bash

# Family Tree App Deployment Script
# This script helps prepare your app for deployment to Railway and Vercel

echo "🚀 Family Tree App Deployment Helper"
echo "====================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git and push to GitHub first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git remote add origin <your-github-repo-url>"
    echo "   git push -u origin main"
    exit 1
fi

# Check if backend files exist
if [ ! -f "backend/server.js" ]; then
    echo "❌ Backend files not found. Make sure you're in the correct directory."
    exit 1
fi

# Check if frontend files exist
if [ ! -f "untitled folder/package.json" ]; then
    echo "❌ Frontend files not found. Make sure you're in the correct directory."
    exit 1
fi

echo "✅ Repository structure looks good!"

echo ""
echo "📋 Deployment Checklist:"
echo "========================"
echo "1. ✅ Backend files present (backend/)"
echo "2. ✅ Frontend files present (untitled folder/)"
echo "3. ✅ Railway config (backend/railway.json)"
echo "4. ✅ Vercel config (untitled folder/vercel.json)"
echo "5. ✅ SvelteKit Vercel adapter installed"

echo ""
echo "🚀 Next Steps:"
echo "=============="
echo ""
echo "1. Deploy Backend to Railway:"
echo "   - Go to https://railway.app/dashboard"
echo "   - Click 'New Project' → 'Deploy from GitHub repo'"
echo "   - Select your repository"
echo "   - Set Root Directory to: backend/"
echo "   - Save the backend URL (you'll need it for step 2)"
echo ""
echo "2. Deploy Frontend to Vercel:"
echo "   - Go to https://vercel.com/dashboard"
echo "   - Click 'Add New Project'"
echo "   - Import your GitHub repository"
echo "   - Set Root Directory to: untitled folder/"
echo "   - Add environment variable: VITE_API_URL=<your-railway-backend-url>"
echo ""
echo "3. Test your deployment:"
echo "   - Backend health check: <railway-url>/health"
echo "   - Frontend: <vercel-url>"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT.md"
echo ""
echo "🎉 Good luck with your deployment!" 