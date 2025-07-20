# 🚀 One-Click Deployment Setup

This guide will help you set up automatic deployment so your app deploys automatically when you push to GitHub.

## Option 1: GitHub Actions (Recommended)

### Step 1: Get Railway Token
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click on your profile → "Account Settings"
3. Go to "Tokens" tab
4. Click "Create Token"
5. Copy the token (you'll need it for Step 3)

### Step 2: Get Vercel Tokens
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your profile → "Settings"
3. Go to "Tokens" tab
4. Click "Create Token"
5. Copy the token

### Step 3: Set GitHub Secrets
1. Go to your GitHub repository
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Add these secrets:
   - `RAILWAY_TOKEN` = Your Railway token from Step 1
   - `VERCEL_TOKEN` = Your Vercel token from Step 2
   - `VERCEL_ORG_ID` = Your Vercel organization ID
   - `VERCEL_PROJECT_ID` = Your Vercel project ID

### Step 4: Deploy Once Manually
1. Deploy backend to Railway once manually (to create the project)
2. Deploy frontend to Vercel once manually (to create the project)
3. Get the project IDs from the URLs

### Step 5: Automatic Deployment
Now when you push to GitHub:
- Changes to `backend/` will auto-deploy to Railway
- Changes to `untitled folder/` will auto-deploy to Vercel

## Option 2: CLI Scripts

### Setup
```bash
# Install CLIs
npm install -g @railway/cli vercel

# Login to both services
railway login
vercel login
```

### Deploy
```bash
# Deploy backend
./scripts/deploy-railway.sh

# Deploy frontend  
./scripts/deploy-vercel.sh
```

## Option 3: Manual Deployment (Simplest)

### Backend (Railway)
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set Root Directory to `backend/`
5. Deploy!

### Frontend (Vercel)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Set Root Directory to `untitled folder/`
5. Add environment variable: `VITE_API_URL=<your-railway-backend-url>`
6. Deploy!

## Which Option Should You Choose?

- **Option 1 (GitHub Actions)**: Best for ongoing development - deploys automatically
- **Option 2 (CLI Scripts)**: Good for quick deployments from your computer
- **Option 3 (Manual)**: Simplest to get started

## Need Help?

- Check the main `DEPLOYMENT.md` for detailed instructions
- Run `./deploy.sh` for a quick checklist
- The GitHub Actions workflows are already created in `.github/workflows/` 