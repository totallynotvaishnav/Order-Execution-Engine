# DEX Transaction Processor

A production-ready DEX transaction processing engine with intelligent routing between Raydium and Meteora, PostgreSQL persistence, real-time WebSocket status updates, and concurrent transaction processing.

🔗 **Live Demo**: [https://dex-transaction-processor.onrender.com](https://dex-transaction-processor.onrender.com/status)

---

## 🎯 Transaction Type: Market Transactions

**Why Market Transactions?**
Market transactions execute immediately at the best available price, making them perfect for demonstrating real-time DEX routing and status streaming. They showcase the core architecture without complex price monitoring logic.

**Extension Strategy:**

-   **Limit Orders**: Add a price monitoring service that checks current prices against target; execute when threshold is met
-   **Sniper Orders**: Implement token launch detection via pool creation events; trigger market execution on detection

---

## 🏗️ Architecture

```
Client Request (WebSocket)
         ↓
    Validation
         ↓
Transaction Created → PostgreSQL → Queue (BullMQ)
         ↓
┌─────────────────────────────┐
│  Transaction Worker         │
│  (10 concurrent)            │
│  ┌────────────────────────┐ │
│  │  Exchange Optimizer     │ │
│  │  • Raydium             │ │ ← Parallel quote fetching
│  │  • Meteora             │ │ ← Price comparison
│  │  Best price ✓          │ │
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │  Simulated Executor    │ │ ← 2-3s delay
│  │  Generate txHash       │ │
│  └────────────────────────┘ │
└─────────────────────────────┘
         ↓
   PostgreSQL Update
         ↓
WebSocket Status Updates
pending → routing → building → submitted → confirmed
```

### Key Components

-   **PostgreSQL Database**: Persistent storage for all transactions
-   **Redis Queue (BullMQ)**: Background job processing with retry logic
-   **WebSocket Server**: Real-time status updates to clients
-   **Exchange Optimizer**: Intelligent DEX routing logic
-   **Transaction Registry**: CRUD operations with database fallback

---

## 🚀 Quick Start

### Prerequisites

-   Node.js 18+
-   Docker (for Redis and PostgreSQL)

### Installation

```bash
# Clone and install
git clone https://github.com/totallynotvaishnav/Order-Execution-Engine.git
cd Order-Execution-Engine
npm install

# Setup environment
cp .env.example .env

# Edit .env and configure (optional - works without database in development)
```

### Local Development (Without Database)

```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Run tests
npm test

# Start server (uses in-memory storage)
npm run dev
```

Server runs at: `http://localhost:3000`

### Production Setup (With PostgreSQL)

```bash
# Start PostgreSQL
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=transactions_db \
  -p 5432:5432 \
  postgres:15-alpine

# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Configure .env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/transactions_db

# Initialize database schema
npm run db:init

# Start server
npm run dev
```

---

## 📡 API Endpoints & Testing

### 1. Health Check

```bash
# Live demo
curl https://dex-transaction-processor.onrender.com/status

# Or locally
curl http://localhost:3000/status
```

**Response:**

```json
{
    "status": "ok",
    "timestamp": "2024-12-17T00:30:00.000Z"
}
```

---

### 2. System Metrics

```bash
# Live demo
curl https://dex-transaction-processor.onrender.com/metrics

# Or locally
curl http://localhost:3000/metrics
```

**Response:**

```json
{
    "queue": {
        "waiting": 0,
        "active": 2,
        "completed": 15,
        "failed": 0,
        "delayed": 0
    },
    "websockets": 3,
    "activeTransactions": 2,
    "totalTransactions": 17
}
```

---

### 3. Process Transaction (WebSocket)

**Install wscat:**

```bash
npm install -g wscat
```

**Connect and submit transaction:**

```bash
# Live demo
wscat -c wss://dex-transaction-processor.onrender.com/api/transactions/process

# Or locally
wscat -c ws://localhost:3000/api/transactions/process
```

**After "Connected", send:**

```json
{ "tokenIn": "SOL", "tokenOut": "USDC", "amount": 100 }
```

**Real-time responses:**

```json
// 1. Connection established
{"type":"session_established","message":"Connected to Transaction Processor. Send your transaction as JSON."}

// 2. Transaction registered
{"type":"transaction_registered","transactionId":"abc-123-def-456","status":"pending","message":"Transaction submitted: abc-123-def-456"}

// 3. Routing
{"transactionId":"abc-123-def-456","status":"routing","data":{"selectedDex":"raydium","message":"Selected raydium"},"timestamp":"2024-12-17T00:30:01.000Z"}

// 4. Building
{"transactionId":"abc-123-def-456","status":"building","data":{"message":"Building transaction..."},"timestamp":"2024-12-17T00:30:02.000Z"}

// 5. Submitted
{"transactionId":"abc-123-def-456","status":"submitted","data":{"message":"Submitted to blockchain"},"timestamp":"2024-12-17T00:30:03.000Z"}

// 6. Confirmed (Final)
{"transactionId":"abc-123-def-456","status":"confirmed","data":{"selectedDex":"raydium","executedPrice":1.0045,"txHash":"mock_raydium_1701342603_xyz789","message":"Transaction executed!"},"timestamp":"2024-12-17T00:30:05.000Z"}
```

---

### 4. Get Transaction Details

```bash
# Live demo
curl https://dex-transaction-processor.onrender.com/transactions/abc-123-def-456

# Or locally
curl http://localhost:3000/transactions/abc-123-def-456
```

**Response:**

```json
{
    "id": "abc-123-def-456",
    "userId": "user_123",
    "type": "market",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amount": 100,
    "status": "confirmed",
    "selectedDex": "raydium",
    "executedPrice": 1.0045,
    "txHash": "mock_raydium_1701342603_xyz789",
    "createdAt": "2024-12-17T00:30:00.000Z",
    "updatedAt": "2024-12-17T00:30:05.000Z",
    "retryCount": 0
}
```

---

## 🧪 Testing Multiple Transactions

### Submit 5 Concurrent Transactions

Open 5 terminals and run simultaneously:

```bash
# Live demo - Terminal 1
wscat -c wss://dex-transaction-processor.onrender.com/api/transactions/process
{"tokenIn":"SOL","tokenOut":"USDC","amount":100}

# Terminal 2
wscat -c wss://dex-transaction-processor.onrender.com/api/transactions/process
{"tokenIn":"SOL","tokenOut":"USDC","amount":150}

# Terminal 3
wscat -c wss://dex-transaction-processor.onrender.com/api/transactions/process
{"tokenIn":"USDC","tokenOut":"SOL","amount":200}

# Terminal 4
wscat -c wss://dex-transaction-processor.onrender.com/api/transactions/process
{"tokenIn":"SOL","tokenOut":"USDC","amount":75}

# Terminal 5
wscat -c wss://dex-transaction-processor.onrender.com/api/transactions/process
{"tokenIn":"SOL","tokenOut":"USDC","amount":125}
```

Watch your server logs to see:

-   ✅ Database persistence for all transactions
-   ✅ Queue processing 10 transactions concurrently
-   ✅ DEX routing decisions logged
-   ✅ Price comparisons (Raydium vs Meteora)
-   ✅ All transactions completing successfully

---

## 🔄 Transaction Lifecycle

```
pending     → Transaction received and saved to database
routing     → Comparing Raydium vs Meteora prices
building    → Creating transaction
submitted   → Sent to blockchain
confirmed   → Execution successful ✓
failed      → Error occurred ✗
```

---

## 🧪 Run Tests

```bash
# All tests
npm test

# With coverage
npm test -- --coverage

# Specific test file
npm test exchange-optimizer.test.ts
```

**Test Coverage:**

-   ✅ Exchange Optimizer (6 tests)
-   ✅ Transaction Registry (6 tests)
-   ✅ Integration Tests (3 tests)

---

## 🌐 Deployment

### Deploy to Render (Recommended)

**Prerequisites:**

-   GitHub account
-   Render account (free tier available)

**One-Click Deploy:**

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New" → "Blueprint"
4. Connect your GitHub repository
5. Select `render.yaml`
6. Review services:
    - Web Service (Node.js app)
    - PostgreSQL Database
    - Redis Instance
7. Click "Apply"
8. Wait ~5 minutes for deployment

**Your app will be live at:** `https://your-app-name.onrender.com`

**Detailed guides:**

-   See `docs/RENDER_DEPLOYMENT.md` for complete deployment guide
-   See `docs/FREE_TIER_GUIDE.md` for free tier limitations and tips
-   See `docs/RENDER_CHECKLIST.md` for step-by-step verification

### Environment Variables (Auto-configured by render.yaml)

-   `DATABASE_URL` - PostgreSQL connection string
-   `REDIS_URL` - Redis connection string
-   `NODE_ENV=production`
-   `SERVER_HOST=0.0.0.0`
-   `PUBLIC_URL` - Your Render URL

---

## 🛠️ Tech Stack

-   **Runtime**: Node.js 18 + TypeScript
-   **API**: Fastify + @fastify/websocket
-   **Database**: PostgreSQL (with in-memory fallback)
-   **Queue**: BullMQ + Redis
-   **Testing**: Jest + ts-jest
-   **Deployment**: Render (with Docker Compose support)

---

## 📁 Project Structure

```
dex-transaction-processor/
├── src/
│   ├── core/
│   │   └── models.ts                    # Type definitions
│   ├── config/
│   │   └── environment.ts               # Environment config
│   ├── modules/
│   │   ├── database/
│   │   │   ├── connection.ts            # PostgreSQL pool
│   │   │   └── schema.sql               # Database schema
│   │   ├── exchange/
│   │   │   └── price-optimizer.ts       # DEX routing logic
│   │   ├── transactions/
│   │   │   └── transaction-registry.ts  # Transaction CRUD
│   │   └── notifications/
│   │       └── realtime-broadcaster.ts  # WebSocket handling
│   ├── workers/
│   │   └── transaction-worker.ts        # BullMQ processor
│   ├── bootstrap.ts                     # Fastify app setup
│   └── index.ts                         # Entry point
├── tests/                               # Test files
├── scripts/
│   ├── init-db.sh                       # DB initialization
│   └── render-build.sh                  # Render build script
├── render.yaml                          # Render blueprint
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔍 Design Decisions

### Why PostgreSQL with Fallback?

-   **Production Ready**: Data persists across restarts
-   **Flexible Development**: Works without database locally (in-memory Map)
-   **Automatic Fallback**: If database unavailable, uses memory
-   **Indexed Queries**: Fast lookups on status, created_at, user_id

### Why Simulated Execution?

-   **Focus on Architecture**: Prioritized clean code structure and real-time patterns
-   **Reliable Testing**: No network dependencies or devnet failures
-   **Instant Deployment**: Works on free hosting without RPC requirements
-   **Realistic Simulation**: 2-3 second delays, 2-5% price variations between DEXs

### Exchange Optimization Strategy

-   **Parallel Queries**: Fetch both DEXs simultaneously (200ms each)
-   **Fee-Adjusted Comparison**: Compare final amounts after fees
-   **Transparent Logging**: All routing decisions logged with price details

### Queue Design

-   **BullMQ**: Industry-standard with built-in retries
-   **Exponential Backoff**: 5s → 10s → 20s between attempts
-   **Graceful Failure**: After 3 attempts, mark failed with error message
-   **Persistent Jobs**: Redis-backed queue survives restarts

### WebSocket Pattern

-   **Single Endpoint**: HTTP → WS upgrade on same route
-   **Connection Pooling**: Multiple clients can subscribe to same transaction
-   **Auto Cleanup**: Connections removed on disconnect
-   **Real-time Updates**: Status changes broadcast immediately

---

## 🐛 Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Start if not running
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=pass postgres:15-alpine

# Or use in-memory mode (remove DATABASE_URL from .env)
```

### Redis Connection Error

```bash
# Check Redis is running
docker ps | grep redis

# Start if not running
docker run -d -p 6379:6379 redis:7-alpine
```

### WebSocket Disconnects Immediately

```bash
# Check server logs for validation errors
# Common issues:
# - Missing tokenIn/tokenOut
# - Negative amount
# - Same token for in and out
```

### Tests Fail

```bash
# Clean install
rm -rf node_modules dist
npm install
npm run build
npm test
```

## 📦 Postman Collection

Import `postman-collection.json` for ready-to-use requests:

-   Health check
-   System metrics
-   Transaction retrieval
-   WebSocket connection instructions

**Note:** WebSocket endpoints cannot be tested via Postman POST requests. Use:

-   `wscat` (recommended)
-   Postman's native WebSocket Request feature

## 🎯 Key Features

✅ **PostgreSQL Persistence** - Data survives server restarts  
✅ **Smart Fallback System** - Works with or without database  
✅ **Connection Pooling** - Efficient database connections  
✅ **Real-time WebSocket Updates** - Live transaction status  
✅ **Intelligent DEX Routing** - Automatic best price selection  
✅ **Concurrent Processing** - 10 simultaneous transactions  
✅ **Automatic Retries** - Exponential backoff on failures  
✅ **Production Ready** - Docker support, health checks, graceful shutdown  
✅ **Free Tier Deployable** - Works on Render free tier  
✅ **Comprehensive Testing** - Unit and integration tests

## 🚀 Performance

-   **Concurrent Transactions**: 10 simultaneous (configurable)
-   **Average Processing Time**: 2-3 seconds per transaction
-   **Database Query Time**: <10ms with indexes
-   **WebSocket Latency**: <50ms for status updates
-   **Cold Start (Free Tier)**: 30-60 seconds
-   **Cold Start (Paid Tier)**: Instant (always on)

---

## 📝 License

MIT License - See LICENSE file for details
