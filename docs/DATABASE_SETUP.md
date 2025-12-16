# Database Setup Guide

## Overview

The DEX Transaction Processor now supports **PostgreSQL for persistent storage** with automatic fallback to in-memory storage if database is unavailable.

## Quick Start

### Option 1: Run Without Database (Development)

The application will automatically use in-memory storage:

```bash
npm run dev
```

⚠️ **Warning:** All data is lost on server restart

### Option 2: Run With PostgreSQL (Production)

1. **Start PostgreSQL**

Local PostgreSQL:
```bash
# Using Docker
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=transactions_db \
  -p 5432:5432 \
  postgres:15-alpine
```

Or use a hosted service (Railway, Neon, Supabase, etc.)

2. **Configure Environment Variables**

Create `.env` file:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/transactions_db
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_SSL=false  # Set to true for hosted databases
```

3. **Initialize Database Schema**

```bash
npm run db:init
```

Or manually:
```bash
psql $DATABASE_URL -f src/modules/database/schema.sql
```

4. **Start Server**

```bash
npm run dev
```

## Database Schema

The application uses a single `transactions` table:

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  token_in VARCHAR(50) NOT NULL,
  token_out VARCHAR(50) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  status VARCHAR(50) NOT NULL,
  selected_dex VARCHAR(50),
  executed_price DECIMAL(20, 8),
  tx_hash VARCHAR(255),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

**Indexes:**
- `status` - Fast filtering by transaction status
- `created_at` - Chronological ordering
- `user_id` - Per-user queries
- `user_id, created_at` - Composite for user history

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | - | PostgreSQL connection string |
| `DATABASE_POOL_MIN` | No | 2 | Minimum pool connections |
| `DATABASE_POOL_MAX` | No | 10 | Maximum pool connections |
| `DATABASE_SSL` | No | false | Enable SSL for connections |

## Connection String Format

```
postgresql://[user]:[password]@[host]:[port]/[database]?[options]
```

Examples:
- Local: `postgresql://postgres:password@localhost:5432/mydb`
- Railway: `postgresql://postgres:...@...railway.app:5432/railway`
- Neon: `postgresql://user:pass@ep-...neon.tech/neondb?sslmode=require`

## Deployment Platforms

### Railway

1. Create PostgreSQL database in Railway
2. Copy `DATABASE_URL` from Railway dashboard
3. Add to environment variables
4. Deploy application
5. Run migration: `npm run db:init`

### Render / Heroku

1. Provision PostgreSQL addon
2. `DATABASE_URL` automatically set
3. Add to `package.json`:
```json
{
  "scripts": {
    "postdeploy": "npm run db:init"
  }
}
```

## Troubleshooting

### "Database not initialized" warning

**Cause:** `DATABASE_URL` not set or invalid

**Solution:** Application falls back to memory - no action needed for development

### Connection timeout

**Cause:** Database not accessible

**Solutions:**
- Check database is running
- Verify `DATABASE_URL` is correct
- Check firewall/network rules
- For hosted DB, verify SSL settings

### Schema already exists

**Solution:** Safe to ignore - schema creation is idempotent

## Migration from In-Memory

If you've been running without a database:

1. Set up PostgreSQL
2. Configure `DATABASE_URL`
3. Run `npm run db:init`
4. Restart server

**Note:** Existing in-memory data will be lost (as it was temporary anyway)

## Package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "db:init": "./scripts/init-db.sh",
    "db:reset": "psql $DATABASE_URL -c 'DROP TABLE IF EXISTS transactions CASCADE' && npm run db:init"
  }
}
```

## Health Check

Verify database connection:

```bash
curl http://localhost:3000/status
```

Response includes database status:
```json
{
  "status": "ok",
  "services": {
    "database": "connected"  // or "unavailable"
  }
}
```
