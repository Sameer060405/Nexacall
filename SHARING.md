# Letting Someone Else Join Your Meeting (Different Device / Network)

When the app runs on **localhost**, only your computer can open it. Your friend’s laptop cannot reach “your localhost,” so they can’t join until your app is reachable on the internet.

You have two options:

---

## Option 1: Expose localhost with a tunnel (quick test)

Use a tunnel so your current machine is reachable from the internet. Both you and your friend use the **same meeting link** (the tunnel URL + meeting path).

### 1. Install ngrok

- Download from [ngrok.com](https://ngrok.com) and create a free account.
- Or: `npm install -g ngrok` (if you use npm).

### 2. Run your app as usual

- **Terminal 1 – backend:**  
  `cd backend && npm start`  
  (listens on port 8000)

- **Terminal 2 – frontend:**  
  `cd frontend && npm start`  
  (listens on port 3000)

### 3. Create two tunnels

- **Terminal 3 – backend tunnel:**  
  `ngrok http 8000`  
  Copy the **HTTPS** URL it shows (e.g. `https://abc123.ngrok-free.app`). This is your **backend URL**.

- **Terminal 4 – frontend tunnel:**  
  `ngrok http 3000`  
  Copy the **HTTPS** URL (e.g. `https://xyz789.ngrok-free.app`). This is your **frontend URL** (the one you’ll share).

### 4. Point the frontend to the public backend

- In `frontend/.env` set:
  ```env
  REACT_APP_API_URL=https://YOUR_BACKEND_NGROK_URL
  ```
  Use the URL from step 3 (e.g. `https://abc123.ngrok-free.app`), **no** trailing slash.

- Restart the frontend (Terminal 2: stop with Ctrl+C, then `npm start` again).

### 5. Use the same meeting link

- On your machine, open the app via the **frontend** ngrok URL, e.g.:  
  `https://xyz789.ngrok-free.app`
- Schedule a meeting or open an existing one and copy the meeting link (e.g.  
  `https://xyz789.ngrok-free.app/video-meet/MEETINGCODE`).
- Send that **exact link** to your friend. They open it in their browser (on their laptop, their network).
- You both must use this same frontend URL so you end up in the same meeting room.

### Notes for ngrok

- Keep all four terminals running while you want others to join.
- Free ngrok URLs change each time you restart ngrok (unless you have a fixed domain).
- If your friend’s browser shows an ngrok warning page, they can click through to continue.

---

## Option 2: Deploy the app (proper “always on” setup)

Deploy backend and frontend to the internet so anyone with the link can join, without running anything on your laptop.

### Backend

- Host the **backend** (Node + Socket.io + MongoDB) on a service that supports WebSockets and a persistent process, e.g.:
  - [Render](https://render.com) (Web Service)
  - [Railway](https://railway.app)
  - [Fly.io](https://fly.io)
- Set environment variables there (e.g. `PORT`, `MONGODB_URI`, `JWT_SECRET`).
- Note the public backend URL (e.g. `https://your-app.onrender.com`).

### Frontend

- Build the frontend with that backend URL:
  ```bash
  cd frontend
  echo "REACT_APP_API_URL=https://your-app.onrender.com" > .env
  npm run build
  ```
- Deploy the `build` folder to a static host, e.g.:
  - [Vercel](https://vercel.com)
  - [Netlify](https://netlify.com)
  - Or the same domain as the backend with static file serving.
- Your meeting links will look like:  
  `https://your-frontend.vercel.app/video-meet/MEETINGCODE`

### Sharing

- Share the **full meeting link** (frontend URL + `/video-meet/MEETINGCODE`). Anyone with the link can join from any device or network.

---

## Summary

| Goal                         | Use                          |
|-----------------------------|------------------------------|
| Quick test with a friend    | **Option 1:** ngrok tunnels  |
| Stable, shareable meetings  | **Option 2:** Deploy backend + frontend |

The meeting room is tied to the **full URL** (including path). So you and your friend must use the **same base URL** (same tunnel or same deployed frontend) and the same meeting code so you land in the same room.
