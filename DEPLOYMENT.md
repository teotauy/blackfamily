# Deployment Guide: Railway (Backend) + Vercel (Frontend)

This guide will help you deploy your Family Tree application to Railway (backend) and Vercel (frontend).

## Prerequisites

- GitHub account
- Railway account (free tier available)
- Vercel account (free tier available)
- Your code pushed to a GitHub repository

## Step 1: Deploy Backend to Railway

### 1.1 Prepare Your Repository
Make sure your backend code is in the `backend/` folder and includes:
- `server.js` - Your Express server
- `package.json` - With `"start": "node server.js"`
- `railway.json` - Railway configuration (already created)

### 1.2 Deploy to Railway
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set the **Root Directory** to `backend/`
5. Railway will automatically:
   - Install dependencies from `package.json`
   - Start the server using `npm start`
   - Assign a public URL

### 1.3 Get Your Backend URL
After deployment, Railway will provide a URL like:
`https://your-app-name.up.railway.app`

**Save this URL** - you'll need it for the frontend configuration.

### 1.4 Set Environment Variables (Optional)
In Railway dashboard, you can set:
- `NODE_ENV=production`
- `JWT_SECRET=your-secret-key` (for better security)
- `FRONTEND_URL=https://your-frontend.vercel.app` (after frontend deployment)

## Step 2: Deploy Frontend to Vercel

### 2.1 Prepare Your Repository
Your frontend code should be in the `untitled folder/` directory and includes:
- SvelteKit configuration with Vercel adapter
- `vercel.json` configuration (already created)
- `package.json` with build scripts

### 2.2 Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Set the **Root Directory** to `untitled folder/`
5. Vercel will automatically:
   - Install dependencies
   - Build the SvelteKit app
   - Deploy to a public URL

### 2.3 Configure Environment Variables
In Vercel dashboard, go to your project → Settings → Environment Variables:
- Add `VITE_API_URL` with your Railway backend URL
- Example: `VITE_API_URL=https://your-app-name.up.railway.app`

### 2.4 Update Frontend Code (if needed)
If you need to use the API URL in your frontend, import the config:
```typescript
import { config } from '$lib/config';

// Use it like this:
const response = await fetch(config.api('/api/people'));
```

## Step 3: Test Your Deployment

### 3.1 Test Backend
Visit your Railway URL + `/health`:
`https://your-app-name.up.railway.app/health`

You should see: `{"status":"OK","timestamp":"..."}`

### 3.2 Test Frontend
Visit your Vercel URL and verify the app loads correctly.

### 3.3 Test API Connection
If your frontend makes API calls, test that they work with the Railway backend.

## Troubleshooting

### Backend Issues
- Check Railway logs for errors
- Verify `package.json` has correct start script
- Ensure all dependencies are in `package.json`

### Frontend Issues
- Check Vercel build logs
- Verify environment variables are set correctly
- Ensure SvelteKit adapter is configured for Vercel

### CORS Issues
- Backend is configured to allow requests from your Vercel domain
- If you get CORS errors, check the `FRONTEND_URL` environment variable in Railway

## Environment Variables Summary

### Railway (Backend)
- `NODE_ENV=production`
- `JWT_SECRET=your-secret-key` (optional)
- `FRONTEND_URL=https://your-frontend.vercel.app` (after frontend deployment)

### Vercel (Frontend)
- `VITE_API_URL=https://your-backend.up.railway.app`

## URLs to Save
- **Backend API**: `https://your-app-name.up.railway.app`
- **Frontend App**: `https://your-project.vercel.app`

## Next Steps
1. Test all functionality
2. Set up custom domains (optional)
3. Configure monitoring and logging
4. Set up automatic deployments from GitHub 