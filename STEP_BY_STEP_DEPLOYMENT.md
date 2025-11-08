# 📋 STEP-BY-STEP Railway Deployment Instructions

## ⚠️ Read This First

**Current Problem:** Railway is running code from the WRONG folder.  
**Solution:** Set Root Directory to `backend` in Railway settings.

---

## 🎯 EXACT STEPS TO FIX THIS

### Step 1: Open Railway Dashboard
1. Go to: https://railway.app/dashboard
2. Sign in if needed
3. You should see your project "blackfamily"

### Step 2: Click On Your Service
1. Find the service called "blackfamily" or "blackfamily / dd9bd028"
2. **Click on it** to open it

### Step 3: Open Settings Tab
1. At the top of the page, you'll see tabs: "Details", "Build Logs", "Deploy Logs"
2. Look for a **"Settings"** tab (might be on the right side or in a menu)
3. **Click "Settings"**

### Step 4: Find Root Directory Field
1. Scroll down in the Settings page
2. Look for a field labeled **"Root Directory"**
3. It might currently be empty, or say `/`, or something else

### Step 5: Set Root Directory
1. **Click** in the "Root Directory" field
2. **Type exactly:** `backend`
3. **Do NOT** type: `backend/` or `/backend` or `./backend`
4. **Just type:** `backend`

### Step 6: Save the Settings
1. Look for a **"Save"** or **"Update"** button
2. **Click it**

### Step 7: Redeploy
1. Go back to the main service page
2. Look for a **"Redeploy"** button (usually at the top)
3. **Click "Redeploy"**
4. Wait 2-3 minutes for it to rebuild

### Step 8: Watch the Logs
1. Click on **"Deploy Logs"** tab
2. Watch for errors
3. **Success looks like:**
   ```
   Installing dependencies...
   Dependencies installed successfully
   Starting container...
   Server running on port XXXX
   Connected to SQLite database.
   ```
4. **Failure looks like:**
   ```
   Error: Cannot find module 'express'
   ```

---

## ✅ If You See Success

You'll see "Server running" and "Connected to SQLite database."

### Get Your Public URL:
1. Look at the top of the service page
2. You'll see a URL like: `https://blackfamily-production-xxxx.up.railway.app`
3. **Copy that URL**

### Test Your Backend:
1. Open a new browser tab
2. Go to: `https://YOUR-URL/health`
3. Replace YOUR-URL with the URL you copied
4. You should see: `{"status":"OK","timestamp":"..."}`

If you see that, **SUCCESS!** 🎉

---

## ❌ If You Still See "Cannot Find Module"

### Try This Nuclear Option:

**Delete Everything and Start Fresh:**

1. In Railway Dashboard
2. Click on your project "blackfamily"
3. Find your service
4. Look for a **"Delete"** or **"Remove"** button (usually in Settings)
5. **Click Delete** (don't worry, your GitHub code is safe)
6. Confirm deletion

### Now Create New Deployment:

**Step 1:** Click **"New"** or **"+ New Service"**

**Step 2:** Select **"GitHub Repo"** or **"Deploy from GitHub"**

**Step 3:** Select your **`blackfamily`** repository

**Step 4:** Railway will show configuration options. Look for:

**Option A: If you see "Root Directory" field:**
- Type: `backend` (no slash!)

**Option B: If you DON'T see Root Directory field:**
- Click on the service name or "Configure" 
- Look for Settings or Advanced options
- Find Root Directory there

**Step 5:** Leave everything else as Railway auto-detects

**Step 6:** Click **"Deploy"**

**Step 7:** Wait 2-3 minutes

**Step 8:** Watch Deploy Logs for success message

---

## 📸 Visual Guide - What You're Looking For

### In Railway Settings, You Should See:

```
Settings
--------
Name: blackfamily
Root Directory: [backend]  ← Type "backend" here
Start Command: npm start    ← Should show this automatically
Build Command: npm install  ← Should show this automatically
Node Version: 18.x or 22.x   ← Any recent version is fine
```

### In Deploy Logs, Success Looks Like:

```
Time (EST)                    Data
Nov 3 2025 13:25:00          Installing dependencies...
Nov 3 2025 13:25:30          npm install
Nov 3 2025 13:26:00          Dependencies installed successfully
Nov 3 2025 13:26:05          Starting container...
Nov 3 2025 13:26:10          Server running on port 12345
Nov 3 2025 13:26:10          Railway deployment check - 2025-11-03T13:26:10Z
Nov 3 2025 13:26:10          Family password: blackfamily2024
Nov 3 2025 13:26:10          Connected to SQLite database.
```

### Failure Looks Like:

```
Time (EST)                    Data
Nov 3 2025 13:25:00          Error: Cannot find module 'express'
Nov 3 2025 13:25:00          at Object.<anonymous> (/app/index.js:2:17)
```

---

## 🆘 Still Confused?

Take these screenshots:

1. Screenshot of your Railway Settings page
2. Screenshot of Deploy Logs showing the error

Share them and I'll tell you exactly what to change.

---

## 🎯 The Bottom Line

**You need to tell Railway to look in the `backend` folder, not the root folder.**

**The setting is called "Root Directory"**

**Set it to: `backend`** (no slashes, no quotes)

**Then save and redeploy.**

---

**Follow these steps exactly. Let me know what happens!**


