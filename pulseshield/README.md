# Pulse Shield — Digital Twin Dashboard

## Deploy to Vercel (5 minutes)

### Step 1 — Upload to GitHub
1. Create a new GitHub repo — name it `pulse-shield-dashboard`
2. Upload all files from this folder to the repo

### Step 2 — Deploy on Vercel
1. Go to vercel.com → Login with GitHub
2. Click "Add New Project" → Import your GitHub repo
3. Vercel auto-detects Next.js — click Deploy

### Step 3 — Add Environment Variables
In Vercel → your project → Settings → Environment Variables → Add:

| Name | Value |
|------|-------|
| TB_HOST | eu.thingsboard.cloud |
| TB_TOKEN | pP2VgUQxExj3nYGkOkxP |

Click Save → Redeploy

### Step 4 — Run Python simulator
Make sure pulse_shield_simulator.py is running on your laptop.
The dashboard fetches live data from ThingsBoard every 2 seconds.

### Local development
```
npm install
npm run dev
```
Open http://localhost:3000
