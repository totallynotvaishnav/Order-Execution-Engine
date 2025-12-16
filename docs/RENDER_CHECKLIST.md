# Render Deployment Checklist

## Pre-Deployment

- [ ] Code is pushed to GitHub
- [ ] All tests pass locally (`npm test`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] `.env.example` is up to date

## Render Setup

### 1. Create Services (Option A: Blueprint)

- [ ] Go to [Render Dashboard](https://dashboard.render.com/)
- [ ] New → Blueprint
- [ ] Connect GitHub repository
- [ ] Select `render.yaml`
- [ ] Review and create services:
  - [ ] Web Service (dex-transaction-processor)
  - [ ] PostgreSQL Database (transactions-db)
  - [ ] Redis Instance (redis)

### 2. Create Services (Option B: Manual)

#### PostgreSQL Database
- [ ] New → PostgreSQL
- [ ] Name: `transactions-db`
- [ ] Plan: Starter or Free
- [ ] Region: Oregon
- [x] Note DATABASE_URL

#### Redis
- [ ] New → Redis  
- [ ] Name: `redis`
- [ ] Plan: Starter or Free
- [ ] Region: Same as database
- [ ] Note REDIS_URL

#### Web Service
- [ ] New → Web Service
- [ ] Connect GitHub repo
- [ ] Runtime: Node
- [ ] Build: `npm install && npm run build && npm run db:init`
- [ ] Start: `npm start`
- [ ] Plan: Starter or Free

## Environment Variables

Set in Render Dashboard → Service → Environment:

### Required
- [ ] `NODE_ENV` = `production`
- [ ] `SERVER_HOST` = `0.0.0.0`
- [ ] `DATABASE_URL` = (from PostgreSQL service)
- [ ] `REDIS_URL` = (from Redis service)

### Optional (with good defaults)
- [ ] `PUBLIC_URL` = `https://your-app.onrender.com`
- [ ] `WORKER_CONCURRENCY_LIMIT` = `10`
- [ ] `RETRY_ATTEMPT_LIMIT` = `3`
- [ ] `USE_LIVE_TRADING` = `false`

## First Deployment

- [ ] Click "Manual Deploy" → "Deploy latest commit"
- [ ] Wait for build (~3-5 minutes)
- [ ] Check build logs for errors
- [ ] Look for "✓ Server operational!" message

## Post-Deployment Verification

### 1. Check Health
```bash
curl https://your-app.onrender.com/status
```
Expected: `{"status":"ok","timestamp":"..."}`

### 2. Check Metrics
```bash
curl https://your-app.onrender.com/metrics
```
Expected: JSON with queue stats

### 3. Check Logs
Render Dashboard → Logs

Look for:
- [ ] `[DB] PostgreSQL connection pool initialized`
- [ ] `[Queue] Background worker active`
- [ ] `✓ Server operational!`
- [ ] No error messages

### 4. Test WebSocket
```bash
wscat -c wss://your-app.onrender.com/api/transactions/process
```

Send:
```json
{"tokenIn":"SOL","tokenOut":"USDC","amount":100}
```

Expected: Connection confirmation and transaction updates

## Troubleshooting

### Build Fails

**Check:**
- [ ] All dependencies in `package.json`
- [ ] TypeScript compiles locally
- [ ] Build logs for specific error

**Common fixes:**
- Remove `npm run db:init` from build command (run manually later)
- Check Node version compatibility

### Database Connection Fails

**Check:**
- [ ] DATABASE_URL is set correctly
- [ ] Database service is running
- [ ] Database and web service in same region

**Fix:**
- Trigger rebuild to reconnect

### Redis Connection Fails

**Check:**
- [ ] REDIS_URL is set
- [ ] Redis instance is running
- [ ] Using connection string format (not host/port)

**Fix:**
- Verify REDIS_URL format: `redis://default:password@host:port`

### App Doesn't Respond

**Check:**
- [ ] Health check endpoint responds
- [ ] Logs show "Server operational"
- [ ] PORT binding is correct (0.0.0.0)

**Fix:**
- Check if using `process.env.PORT` (required for Render)
- Verify `SERVER_HOST=0.0.0.0`

## Monitoring

- [ ] Set up uptime monitoring (UptimeRobot, Better Stack)
- [ ] Configure Render health checks
- [ ] Enable email notifications for failures

## Security

- [ ] Review environment variables (no secrets exposed)
- [ ] Enable HTTPS (automatic on Render)
- [ ] Consider adding CORS configuration
- [ ] Consider adding rate limiting

## Optional: Custom Domain

- [ ] Add custom domain in Render settings
- [ ] Update DNS records (CNAME)
- [ ] Wait for SSL certificate provisioning
- [ ] Update `PUBLIC_URL` environment variable

## Maintenance

- [ ] Set up automatic deploys (on git push)
- [ ] Monitor usage and billing
- [ ] Plan database backups (paid plans only)
- [ ] Review logs regularly

## Cost Tracking

### Free Tier
- Services spin down after 15min inactivity
- Limited hours per month
- Good for testing only

### Starter Plan ($21/month)
- Web Service: $7/month
- PostgreSQL: $7/month
- Redis: $7/month
- Always on, good for production

## Support

- **Render Docs:** https://render.com/docs
- **Render Status:** https://status.render.com
- **Community:** https://community.render.com

---

## Quick Deploy Commands

If manually deploying or debugging:

```bash
# Local test
npm run build
npm start

# Database setup (after first deploy)
# Render Dashboard → Shell
npm run db:init

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM transactions;"

# Check Redis
redis-cli -u $REDIS_URL PING
```

---

## Success Criteria

Your deployment is successful when:

- ✅ Health endpoint returns 200 OK
- ✅ Metrics endpoint shows stats
- ✅ Database connection confirmed in logs
- ✅ Redis/queue worker active
- ✅ WebSocket connections work
- ✅ No errors in logs for 5+ minutes
- ✅ Can create and track transactions

**You're live!** 🚀
