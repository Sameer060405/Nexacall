# Host NexaCall for Free

Your app has:
- **Frontend**: React (runs in the browser)
- **Backend**: Node.js + Express + Socket.io (must run on a server)
- **Database**: MongoDB Atlas (cloud, free tier)

Use **two free hosts**: backend on **Render**, frontend on **Vercel**. Both have free tiers and work with Socket.io.

---

## Before you start

1. Put your project on **GitHub** (if not already).
2. Have **MongoDB Atlas** set up with a connection string in `backend/.env` as `MONGODB_URI`.
3. In Atlas: **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) so Render can connect.

---

## Step 1: Deploy the backend on Render (free)

1. Go to [render.com](https://render.com) and sign up (GitHub login is easiest).
2. **Dashboard** → **New** → **Web Service**.
3. Connect your GitHub account and select the **NexaCall** repo.
4. Configure:
   - **Name**: e.g. `nexacall-api`
   - **Root Directory**: `backend` (so Render uses the folder that has `package.json` and `src/app.js`).
   - **Runtime**: **Node**.
   - **Build Command**: `npm install` (or leave default).
   - **Start Command**: `npm start` (runs `node src/app.js` from `package.json`).
   - **Instance Type**: **Free**.
5. **Environment** (Environment Variables):
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = your Atlas connection string (same as in `backend/.env`).
   - `PORT` = leave as-is (Render sets it automatically; your app uses `process.env.PORT`).
   - If you use JWT: `JWT_SECRET` = a long random string (same as in `.env`).
6. Click **Create Web Service**.
7. Wait for the first deploy. Copy your backend URL, e.g. `https://nexacall-api.onrender.com`.

**Note:** On the free tier, the service sleeps after ~15 minutes of no traffic. The first request after that may take 30–60 seconds (cold start).

---

## Step 2: Deploy the frontend on Vercel (free)

1. Go to [vercel.com](https://vercel.com) and sign up (GitHub login is easiest).
2. **Add New** → **Project** → import your **NexaCall** repo.
3. Configure:
   - **Root Directory**: click **Edit** and set to `frontend` (so Vercel uses the React app).
   - **Framework Preset**: **Create React App** (or Vite if you use that).
   - **Build Command**: `npm run build` (default).
   - **Output Directory**: `build` (default for CRA).
4. **Environment Variables**:
   - **Key**: `REACT_APP_API_URL`  
   - **Value**: your **backend URL from Step 1**, e.g. `https://nexacall-api.onrender.com`  
   - No trailing slash.
5. Click **Deploy**.
6. When done, you get a URL like `https://nexacall-xxx.vercel.app`. That’s your live app.

---

## Step 3: Allow your frontend in backend CORS (recommended)

So only your Vercel site can call the API:

1. **Backend** (Render): **Environment** → add:
   - `FRONTEND_URL` = `https://nexacall-xxx.vercel.app` (your real Vercel URL).
2. In your code, use that in CORS. For example in `backend/src/app.js` you can set:
   - `origin: process.env.FRONTEND_URL || true` in `cors({ origin: ... })` so in production only that origin is allowed.

If you prefer to keep it open for testing, you can leave `app.use(cors())` as-is (allows any origin). You can tighten it later.

---

## Step 4: Test the live app

1. Open your **Vercel URL** (e.g. `https://nexacall-xxx.vercel.app`).
2. Register / log in. Requests should go to `https://nexacall-api.onrender.com`.
3. Create or join a meeting and start a call. Audio/video and Socket.io should work.

If the backend was sleeping, the first login or first call might be slow; after that it stays fast until the next sleep.

---

## Quick checklist

| Where        | What to set |
|-------------|-------------|
| **MongoDB Atlas** | Network Access: Allow from anywhere `0.0.0.0/0` |
| **Render (backend)** | `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (if used), correct **Start Command** and **Root Directory** |
| **Vercel (frontend)** | **Root Directory** = `frontend`, `REACT_APP_API_URL` = your Render backend URL |

---

## If your repo structure is different

- If the **backend** is not in a `backend` folder at repo root, set Render **Root Directory** to the folder that contains `package.json` and `src/app.js`.
- If the **frontend** is not in a `frontend` folder, set Vercel **Root Directory** to the folder that contains the React `package.json` and `src/`.

---

## Optional: custom domain

- **Vercel**: Project → Settings → Domains → add your domain.
- **Render**: Service → Settings → Custom Domain.

You can do this after everything works on the default `.vercel.app` and `.onrender.com` URLs.
