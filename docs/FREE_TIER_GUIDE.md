# Render Free Tier - Important Notes

## ⚠️ Free Tier Limitations

You're using Render's **free tier**. Here's what that means:

### Web Service (Your App)
- **Spins down after 15 minutes** of inactivity
- **First request slow** (~30-60 seconds to wake up)
- **750 hours/month** free (enough for one always-running service)
- Good for: demos, portfolios, testing

### PostgreSQL Database
- **1GB storage** (plenty for most demos)
- **90-day data retention** - data deleted after 90 days
- **No automatic backups**
- Good for: testing, demos (NOT production)

### Redis Cache
- **25MB storage** (enough for queue)
- **Volatile** - can be cleared
- Good for: demos, testing

---

## What This Means for You

### ✅ Will Work Fine For:
- Portfolio projects
- Demos for interviews
- Learning/testing
- Low-traffic personal projects

### ❌ Not Suitable For:
- Production applications
- Apps needing 24/7 uptime
- Anything with real user data (90-day deletion!)
- High-traffic sites

---

## Cold Start Issue

**Problem:** First request after 15 minutes takes 30-60 seconds

**Solutions:**

### Free: Use Uptime Monitor
Keep your app "warm" by pinging it every 10 minutes:

1. **UptimeRobot** (Free)
   - Go to https://uptimerobot.com/
   - Add monitor: `https://your-app.onrender.com/status`
   - Check interval: 10 minutes
   - Free tier allows 50 monitors

2. **Cron-job.org** (Free)
   - Go to https://cron-job.org/
   - Create job to hit your `/status` endpoint
   - Every 10 minutes

⚠️ **Note:** This uses your 750 hours faster, but keeps app responsive

### Paid: Upgrade to Starter ($7/month)
- Always on, no cold starts
- Recommended if this is for serious use

---

## Data Retention Warning

### 🚨 CRITICAL: 90-Day Data Deletion

Your PostgreSQL database on free tier **deletes all data after 90 days**.

**Alternatives:**

1. **Use In-Memory Only** (No database)
   - Remove `DATABASE_URL` from environment
   - App automatically uses in-memory storage
   - Pro: Simple, no data loss worry
   - Con: Data lost on restart (acceptable for demos)

2. **External Free Database**
   Use a free hosted database instead:
   
   **Neon** (Recommended)
   - 3GB storage
   - No expiration
   - Free tier: https://neon.tech/
   - Set `DATABASE_URL` to Neon connection string

   **Supabase**
   - 500MB storage
   - No expiration
   - Free tier: https://supabase.com/
   - Set `DATABASE_URL` to Supabase Postgres URL

   **Railway** (if you have credits)
   - $5 free credits
   - No expiration
   - https://railway.app/

3. **Upgrade Render Database** ($7/month)
   - Permanent storage
   - Daily backups
   - Recommended for production

---

## Recommended Free Tier Setup

### For Demos/Portfolio

**Web Service:** Render Free  
**Database:** Neon Free (persistent)  
**Redis:** Render Free  
**Uptime Monitor:** UptimeRobot Free  

**Total Cost:** $0  
**Limitations:** Cold starts, but data persists

### Setup Steps:

1. **Create Neon Database**
   ```bash
   # 1. Go to neon.tech
   # 2. Create project
   # 3. Copy connection string
   ```

2. **Update Render Config**
   ```
   In Render Dashboard:
   Remove: DATABASE_URL (from Render PostgreSQL)
   Add: DATABASE_URL = <neon-connection-string>
   ```

3. **Remove Database from render.yaml**
   ```yaml
   # Comment out or remove the databases section
   # Keep only web service and redis
   ```

4. **Deploy**
   - Your app now uses Neon (persistent, free)
   - No 90-day deletion
   - Cold starts still happen (acceptable for free)

---

## Performance Tips for Free Tier

### 1. Reduce Memory Usage
Render free tier has limited RAM:
```typescript
// Lower concurrency for free tier
WORKER_CONCURRENCY_LIMIT=3  // instead of 10
```

### 2. Optimize Cold Starts
```json
// In package.json - faster startup
"start": "node dist/index.js"  // Already optimized
```

### 3. Monitor Usage
Check Render Dashboard:
- CPU usage
- Memory usage
- Request count
- Bandwidth

---

## Deployment Checklist for Free Tier

- [ ] Set all plans to `free` in `render.yaml` ✅ Already done
- [ ] Consider using Neon instead of Render PostgreSQL
- [ ] Set up UptimeRobot to prevent cold starts
- [ ] Accept 30-60s first request delay
- [ ] Set realistic expectations for demos
- [ ] **Do NOT use for production**

---

## When to Upgrade

Upgrade to paid ($21/month total) when:

- ✅ Getting real users
- ✅ Need 24/7 uptime
- ✅ Can't accept cold starts
- ✅ Need data persistence beyond 90 days
- ✅ Making money from the project

---

## Current Configuration

Your `render.yaml` is now set to:
- Web Service: **Free** ✅
- PostgreSQL: **Free** (90-day limit) ⚠️
- Redis: **Free** ✅

**Total Monthly Cost:** $0  
**Limitations:** Cold starts + 90-day data deletion

**Recommended Action:** Consider Neon for database to avoid data loss.
