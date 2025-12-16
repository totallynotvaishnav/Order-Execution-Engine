# Deploying to Render

Complete guide for deploying the DEX Transaction Processor to Render.

## Quick Deploy

### Option 1: One-Click Deploy (Recommended)

1. **Fork this repository** to your GitHub account

2. **Click Deploy to Render** (or use render.yaml):
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically create:
     - Web Service (Node.js app)
     - PostgreSQL Database
     - Redis Instance

3. **Wait for deployment** (~5 minutes)

4. **Access your app** at `https://your-app-name.onrender.com`

### Option 2: Manual Deploy

1. **Create PostgreSQL Database**
   - Dashboard → New → PostgreSQL
   - Name: `transactions-db`
   - Region: Oregon (or your preferred)
   - Plan: Starter ($7/month) or Free
   - Note the connection details

2. **Create Redis Instance**
   - Dashboard → New → Redis
   - Name: `redis`
   - Region: Same as database
   - Plan: Starter ($7/month) or Free
   - Note the connection URL

3. **Create Web Service**
   - Dashboard → New → Web Service
   - Connect your GitHub repo
   - Configure:
     - **Name:** `dex-transaction-processor`
     - **Region:** Same as database/redis
     - **Branch:** `main`
     - **Runtime:** Node
     - **Build Command:** `npm install && npm run build && npm run db:init`
     - **Start Command:** `npm start`
     - **Plan:** Starter ($7/month) or Free

4. **Set Environment Variables**
   ```
   NODE_ENV=production
   SERVER_PORT=10000
   SERVER_HOST=0.0.0.0
   PUBLIC_URL=https://your-app-name.onrender.com
   DATABASE_URL=<from PostgreSQL service>
   REDIS_URL=<from Redis service>
   WORKER_CONCURRENCY_LIMIT=10
   RETRY_ATTEMPT_LIMIT=3
   USE_LIVE_TRADING=false
   ```

5. **Deploy** - Render will build and start your app

---

## Environment Variables

Render automatically provides some variables. Here's what you need:

### Auto-Provided by Render
- `PORT` - Render sets this (use `SERVER_PORT` or fallback to `PORT`)
- `DATABASE_URL` - From PostgreSQL addon
- `REDIS_URL` - From Redis addon

### You Must Set
| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Required |
| `SERVER_HOST` | `0.0.0.0` | Bind to all interfaces |
| `PUBLIC_URL` | `https://your-app.onrender.com` | For correct logs |
| `WORKER_CONCURRENCY_LIMIT` | `10` | Adjust based on plan |

### Optional
| Variable | Default | Description |
|----------|---------|-------------|
| `RETRY_ATTEMPT_LIMIT` | `3` | Max retry attempts |
| `RETRY_BACKOFF_DURATION` | `5000` | Retry delay (ms) |
| `USE_LIVE_TRADING` | `false` | Enable real DEX trading |
| `SIMULATION_LATENCY` | `2000` | Mock execution delay |

---

## Database Setup

Render will automatically create the database, but you need to initialize the schema:

### Automatic (via render.yaml)
Schema is created during build - nothing to do!

### Manual
```bash
# Add to Build Command:
npm install && npm run build && npm run db:init
```

Or run manually via Render Shell:
```bash
# In Render Dashboard → Shell
npm run db:init
```

---

## Pricing

### Free Tier
- ⚠️ Services spin down after 15 min inactivity
- ✅ Good for demos/testing
- ❌ Not for production (slow cold starts)

**Monthly Cost:** $0

### Starter Tier (Recommended)
- ✅ Always on
- ✅ 512MB RAM
- ✅ Shared CPU
- ✅ Good for production

**Monthly Cost:**
- Web Service: $7/month
- PostgreSQL: $7/month  
- Redis: $7/month
- **Total: $21/month**

### Pro Tier
- ✅ Dedicated CPU
- ✅ More RAM (2GB+)
- ✅ Better performance

**Monthly Cost:** ~$50+/month

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Health check
curl https://your-app.onrender.com/status

# Should return:
{
  "status": "ok",
  "timestamp": "..."
}
```

### 2. Test Endpoints

```bash
# Get metrics
curl https://your-app.onrender.com/metrics

# Test WebSocket (use wscat or Postman)
wscat -c wss://your-app.onrender.com/api/transactions/process
```

### 3. Check Logs

Render Dashboard → Your Service → Logs

Look for:
```
✓ Server operational!
📍 Server Address: https://your-app.onrender.com
[DB] PostgreSQL connection pool initialized successfully
[Queue] Background worker active
```

---

## Troubleshooting

### Build Fails

**Error:** `npm run db:init failed`

**Solution:** Remove from build command, run manually after deploy:
```bash
# Render Dashboard → Shell
npm run db:init
```

### Database Connection Errors

**Error:** `Connection timeout`

**Checklist:**
- [ ] DATABASE_URL is set correctly
- [ ] Database and web service in same region
- [ ] Database is not paused (free tier)

### Redis Connection Errors

**Error:** `ECONNREFUSED`

**Solution:**
- Verify `REDIS_URL` is set
- Check Redis instance is running
- Ensure same region as web service

### Cold Starts (Free Tier)

**Issue:** First request takes 30+ seconds

**Solutions:**
- Upgrade to Starter plan ($7/month)
- Use uptime monitor (UptimeRobot) to ping every 10 min
- Accept slow first request for free tier

---

## Monitoring

### Health Check
Render automatically monitors `/status` endpoint

Configure in render.yaml:
```yaml
healthCheckPath: /status
```

### Uptime Monitoring
Use external service:
- [UptimeRobot](https://uptimerobot.com/) (Free)
- [Better Stack](https://betterstack.com/) (Paid)
- [Pingdom](https://pingdom.com/) (Paid)

### Logs
- Render Dashboard → Logs
- Limited retention on free tier
- Consider log aggregation service (Logtail, Datadog)

---

## Scaling

### Vertical Scaling
Render Dashboard → Settings → Instance Type
- Starter: 512MB RAM
- Standard: 2GB RAM
- Pro: 4GB+ RAM

### Horizontal Scaling
Render Pro plan supports multiple instances behind load balancer

---

## Custom Domain

1. Render Dashboard → Settings → Custom Domain
2. Add your domain (e.g., `api.yourdomain.com`)
3. Update DNS:
   - Type: CNAME
   - Name: api
   - Value: `your-app.onrender.com`
4. Wait for SSL certificate (automatic)

---

## CI/CD

Render automatically deploys on git push:

1. Push to GitHub
2. Render detects change
3. Runs build
4. Deploys new version
5. Zero-downtime deployment

### Manual Deploy
Render Dashboard → Manual Deploy → Deploy Latest Commit

---

## Backup & Recovery

### Database Backups
- Free tier: No automatic backups
- Paid tier: Daily automatic backups
- Manual: Use `pg_dump`

```bash
# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

---

## Security Checklist

Before going live:

- [ ] Set `NODE_ENV=production`
- [ ] Use PostgreSQL SSL (automatic on Render)
- [ ] Set strong Redis password
- [ ] Configure CORS for your domain
- [ ] Enable rate limiting
- [ ] Set `PUBLIC_URL` correctly
- [ ] Review environment variables
- [ ] Test all endpoints
- [ ] Monitor logs for errors

---

## Support

- [Render Documentation](https://render.com/docs)
- [Render Status](https://status.render.com/)
- [Render Community](https://community.render.com/)

---

## Quick Reference

| Resource | URL |
|----------|-----|
| Dashboard | https://dashboard.render.com/ |
| Your App | https://your-app.onrender.com |
| Logs | Dashboard → Service → Logs |
| Shell | Dashboard → Service → Shell |
| Env Vars | Dashboard → Service → Environment |
