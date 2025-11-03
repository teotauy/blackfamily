# 🚨 Railway Troubleshooting Guide

## Current Error
```
Error: Cannot find module 'express'
Require stack: /app/index.js:2:17
```

**Problem:** Railway is trying to run `index.js` which we deleted. It should run `server.js` instead.

---

## ✅ Quick Fix

### Option 1: Check Start Command (Most Likely Fix)

In Railway Dashboard:
1. Click on your service
2. Go to **"Settings"** tab
3. Scroll to **"Start Command"** section
4. Should say: `npm start`
5. If it says something else or is empty, change it to: `npm start`
6. Save and redeploy

### Option 2: Check Root Directory

In Railway Settings:
1. **Root Directory** should be: `backend`
2. Not empty, not `/`, not `backend/` with trailing slash
3. Just: `backend`

### Option 3: Force Redeploy

1. In Railway Dashboard
2. Click **"Settings"** tab
3. Scroll to bottom
4. Click **"Delete"** service (don't worry, we'll recreate)
5. Go back to project
6. Click **"New Service"**
7. Select **"GitHub Repo"**
8. Choose `blackfamily` repository
9. **Root Directory:** `backend`
10. **Start Command:** `npm start`
11. Deploy

---

## ✅ Verify Your Settings

Your Railway service should have:

**Settings Tab:**
- **Name:** blackfamily or similar
- **Root Directory:** `backend` (important!)
- **Start Command:** `npm start` OR `node server.js`
- **Build Command:** (leave empty, use default)
- **Node Version:** 18 or higher

**Environment Tab:**
- No special variables needed
- `NODE_ENV` is set automatically
- `PORT` is set automatically

---

## 🔍 Check Logs Tab

Look at **Build Logs** (not Deploy Logs) for:
- ✅ "Installing dependencies"
- ✅ "Dependencies installed successfully" 
- ✅ Any errors during npm install

If you see dependency errors, that's a different problem.

---

## 🎯 Expected Deploy Logs

Once fixed, you should see:
```
Installing dependencies...
npm install
...
Starting container...
Server running on port 5000 (or whatever Railway assigns)
Railway deployment check - [timestamp]
Family password: blackfamily2024
Connected to SQLite database.
```

---

## 🆘 Still Not Working?

### Delete and Start Fresh

Sometimes Railway caches old settings:
1. Delete the existing deployment
2. Create completely new deployment
3. Make sure to select `backend` as root directory
4. Don't change any other settings
5. Let Railway auto-detect everything

### Check GitHub Connection

Make sure:
1. Railway is connected to your GitHub account
2. Railway has access to `blackfamily` repository
3. Railway is deploying from `main` branch
4. Your latest commits are on GitHub

---

## ✅ Success Indicators

You'll know it's working when Deploy Logs show:
- ✅ No "Cannot find module" errors
- ✅ "Server running on port..."
- ✅ "Connected to SQLite database."
- ✅ Service status is "Active"
- ✅ /health endpoint returns JSON

---

## 📝 Most Common Issue

**Root Directory not set correctly!**

Railway is probably trying to run from repository root, not from `backend/` folder.

**Solution:** 
- Set Root Directory to exactly: `backend`
- No leading slash, no trailing slash
- Just the word: backend

---

**Try these fixes and let me know what you see in the logs!**

