# Family Tree App Deployment Guide

## Overview
This app uses:
- **Frontend**: Vercel (FREE)
- **Backend**: Railway (FREE tier, $5/month for paid)

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create a new project

### 1.2 Deploy Backend
1. In Railway dashboard, click "Deploy from GitHub repo"
2. Select your repository
3. Set the **Root Directory** to `backend`
4. Railway will automatically detect it's a Node.js app
5. Deploy!

### 1.3 Get Backend URL
1. After deployment, Railway will give you a URL like: `https://your-app-name.railway.app`
2. Copy this URL - you'll need it for the frontend

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import your repository

### 2.2 Configure Environment Variables
1. In Vercel dashboard, go to your project settings
2. Add environment variable:
   - **Name**: `API_BASE_URL`
   - **Value**: `https://your-app-name.railway.app/api`
   (Replace with your actual Railway URL)

### 2.3 Deploy Frontend
1. Vercel will automatically deploy your frontend
2. You'll get a URL like: `https://your-app-name.vercel.app`

## Step 3: Test Your App
1. Visit your Vercel URL
2. Test adding/editing family members
3. Everything should work with your Railway backend!

## Step 4: Custom Domain (Optional)
1. **Vercel**: Add custom domain in project settings
2. **Railway**: Custom domains available on paid plan

## Troubleshooting
- If API calls fail, check the `API_BASE_URL` environment variable
- If backend won't start, check Railway logs
- Database is SQLite and persists on Railway

## Cost Breakdown
- **Vercel**: FREE (frontend)
- **Railway**: FREE tier (500 hours/month) → $5/month when needed
- **Total**: FREE to start, $5/month when you upgrade 