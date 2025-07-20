#!/bin/bash

# Deploy Backend to Railway using CLI
# Prerequisites: 
# 1. Install Railway CLI: npm install -g @railway/cli
# 2. Login: railway login

echo "🚂 Deploying Backend to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

# Deploy to Railway
echo "📦 Deploying backend..."
cd backend
railway up

echo "✅ Backend deployed! Check Railway dashboard for the URL." 