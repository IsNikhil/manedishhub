# Deploying Mane Dish Hub for Free

## Architecture
- **Frontend** → Vercel (free forever)
- **Backend**  → Render.com (free tier)
- **Database** → SQLite on Render (ephemeral — resets on redeploy, fine for a dining app)

> **Note on menu scraping:** The dining hub website is JavaScript-rendered and requires
> a headless Chromium browser to scrape. The Render free tier (512 MB RAM) is too small
> to run Chromium. Set `DISABLE_SCRAPER=true` (default in render.yaml) to run without it.
> You can still add/manage menu items manually via the admin panel at `/admin`, or upgrade
> to Render Starter ($7/mo) and set `DISABLE_SCRAPER=false` to re-enable auto-scraping.

---

## Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/mane-dish-hub.git
git push -u origin main
```

---

## Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Instance Type:** Free
4. Add these **Environment Variables** in the Render dashboard:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `SESSION_SECRET` | (click Generate) |
   | `ADMIN_PASSWORD` | your chosen admin password |
   | `CLIENT_URL` | your Vercel URL (add after Step 3) |
   | `DISABLE_SCRAPER` | `true` |

5. Click **Deploy**
6. Copy your Render URL — it looks like `https://mane-dish-hub-api.onrender.com`

---

## Step 3 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo
2. Configure:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add this **Environment Variable**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | your Render URL from Step 2 |

4. Click **Deploy**
5. Copy your Vercel URL — it looks like `https://mane-dish-hub.vercel.app`

---

## Step 4 — Update CORS on Render

Go back to your Render service → Environment Variables → add/update:

| Key | Value |
|-----|-------|
| `CLIENT_URL` | your Vercel URL from Step 3 |

Then click **Manual Deploy → Deploy latest commit**.

---

## Step 5 — Test

- Visit your Vercel URL — the app should load
- Go to `https://your-vercel-url.vercel.app/admin` → log in with your `ADMIN_PASSWORD`
- The menu will be empty (scraper is disabled). You can either:
  - Leave it and manually hit **Refresh Menu** (will show empty with a notice)
  - Upgrade to Render Starter ($7/mo) and set `DISABLE_SCRAPER=false`

---

## Upgrading Scraping (optional, $7/mo)

On Render, upgrade to **Starter** plan and:
1. Change `DISABLE_SCRAPER` → `false`
2. Change Build Command to:
   ```
   npm install && npx playwright install-deps && npx playwright install chromium
   ```
3. Redeploy

---

## Free Tier Limitations

| Limitation | Impact |
|-----------|--------|
| Render free spins down after 15 min inactivity | First load after idle takes ~30s |
| No persistent disk on free tier | Votes, feedback, photos reset on redeploy |
| No auto menu scraping | Must refresh manually or upgrade |
| 750 hours/month | Enough for one service running 24/7 |

## Costs Summary

| Fully Free | $7/month (Render Starter) |
|-----------|--------------------------|
| All features except auto-scrape | Everything including auto-scrape |
| Data resets on redeploy | Persistent disk — data survives |
| Spins down when idle | Always on |
