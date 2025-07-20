#!/bin/bash

# Deploy Frontend to Vercel using CLI
# Prerequisites:
# 1. Install Vercel CLI: npm install -g vercel
# 2. Login: vercel login

echo "🚀 Deploying Frontend to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if logged in
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please run: vercel login"
    exit 1
fi

# Deploy to Vercel
echo "📦 Deploying frontend..."
vercel --prod

echo "✅ Frontend deployed! Check Vercel dashboard for the URL." 