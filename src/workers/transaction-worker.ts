import { Job, Queue, Worker } from "bullmq";
import { config } from "../config/environment";
import { exchangeOptimizer } from "../modules/exchange/price-optimizer";
import { transactionRegistry } from "../modules/transactions/transaction-registry";
import { realtimeBroadcaster } from "../modules/notifications/realtime-broadcaster";
import { Transaction, WorkerTask } from "../core/models";

// Cache configuration supporting Render, Railway and local environments
const CACHE_SETTINGS = (() => {
  // Debug logging
  console.log('[DEBUG] REDIS_URL:', process.env.REDIS_URL);
  console.log('[DEBUG] CACHE_AUTH_TOKEN:', process.env.CACHE_AUTH_TOKEN);
  console.log('[DEBUG] CACHE_SERVER_HOST:', process.env.CACHE_SERVER_HOST);
  console.log('[DEBUG] CACHE_SERVER_PORT:', process.env.CACHE_SERVER_PORT);
  console.log('[DEBUG] config.cache.host:', config.cache.host);
  console.log('[DEBUG] config.cache.port:', config.cache.port);
  
  // Render provides REDIS_URL in connection string format
  const redisUrl = process.env.REDIS_URL || process.env.CACHE_AUTH_TOKEN;
  
  console.log('[DEBUG] Using redisUrl:', redisUrl);
  console.log('[DEBUG] Starts with redis://?', redisUrl?.startsWith('redis://'));
  
  if (redisUrl && redisUrl.startsWith('redis://')) {
    // Parse redis://host:port format into proper connection object
    console.log('[DEBUG] Using connection string format');
    
    try {
      const url = new URL(redisUrl);
      const settings = {
        host: url.hostname,
        port: parseInt(url.port || '6379'),
        password: url.password || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      };
      console.log('[DEBUG] Parsed connection settings:', settings);
      return settings;
    } catch (err) {
      console.error('[ERROR] Failed to parse Redis URL:', err);
      // Fallback to host/port format
    }
  }
  
  // Use individual host/port/password (Railway/local format)
  console.log('[DEBUG] Using host/port format');
  return {
    host: config.cache.host,
    port: config.cache.port,
    password: config.cache.authToken,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
})();

const RETRY_LIMIT = config.worker.retryAttemptLimit;

export class TransactionWorker {
  private jobQueue: Queue<WorkerTask>;
  private backgroundWorker: Worker<WorkerTask> | null = null;

  constructor() {
    console.log("[Queue] Establishing connection to cache server:", CACHE_SETTINGS);

    this.jobQueue = new Queue("transactions", { connection: CACHE_SETTINGS });
    console.log("[Queue] Transaction worker initialized");
  }

  async initialize(): Promise<void> {
    console.log("[Queue] Starting background worker...");
    
    console.log("[DEBUG] Worker using CACHE_SETTINGS:", CACHE_SETTINGS);
    
    this.backgroundWorker = new Worker(
      "transactions",
      async (job: Job<WorkerTask>) => await this.executeTask(job),
      {
        connection: CACHE_SETTINGS,  // ← THIS IS THE FIX!
        concurrency: config.worker.concurrencyLimit,
      }
    );

    this.backgroundWorker.on("completed", (job) => {
      console.log(`[Queue] Task ${job.id} completed successfully`);
    });

    this.backgroundWorker.on("failed", (job, error) => {
      console.error(`[Queue] Task execution failed:`, error.message);
    });

    console.log("[Queue] Background worker active");
  }

  async enqueueTransaction(transaction: Transaction): Promise<void> {
    try {
      const task = await this.jobQueue.add(
        "process-transaction",
        { transactionId: transaction.id, retryCount: 0 },
        {
          attempts: RETRY_LIMIT,
          backoff: { type: "exponential", delay: config.worker.retryBackoffDuration },
        }
      );
      console.log(`[Queue] Transaction ${transaction.id} enqueued`);
    } catch (error) {
      console.error(`[Queue] Failed to enqueue transaction:`, error);
      realtimeBroadcaster.notifyFailure(transaction.id, "Failed to queue");
    }
  }

  private async executeTask(job: Job<WorkerTask>): Promise<void> {
    const { transactionId, retryCount } = job.data;
    console.log(
      `\n[Processing] BEGIN ${transactionId} (attempt ${
        retryCount + 1
      }/${RETRY_LIMIT})`
    );

    try {
      const currentTransaction = await transactionRegistry.findTransaction(transactionId);
      if (!currentTransaction) {
        throw new Error(`Transaction not found`);
      }

      console.log(`[Processing] PHASE 1: Routing exchanges...`);
      realtimeBroadcaster.emitUpdate(transactionId, "routing", {
        message: "Comparing prices...",
      });
      
      const quotes = await exchangeOptimizer.retrieveAllPrices(
        currentTransaction.tokenIn,
        currentTransaction.tokenOut,
        currentTransaction.amount
      );
      
      const routing = exchangeOptimizer.determineOptimalExchange(quotes);
      
      await transactionRegistry.modifyTransaction(transactionId, {
        selectedDex: routing.selectedDex,
        status: "routing",
      });
      
      realtimeBroadcaster.notifyExchangeSelection(transactionId, routing.selectedDex);
      console.log(`[Processing] Selected exchange: ${routing.selectedDex}`);

      console.log(`[Processing] PHASE 2: Building transaction...`);
      realtimeBroadcaster.notifyPreparation(transactionId);
      await transactionRegistry.updateState(transactionId, "building");
      await this.pause(500);

      console.log(`[Processing] PHASE 3: Submitting to blockchain...`);
      realtimeBroadcaster.notifyBroadcast(transactionId);
      await transactionRegistry.updateState(transactionId, "submitted");

      console.log(`[Processing] PHASE 4: Executing swap...`);
      const execution = await exchangeOptimizer.performTokenSwap(
        routing.selectedDex,
        currentTransaction.amount
      );
      console.log(`[Processing] Swap executed! Hash: ${execution.txHash}`);

      await transactionRegistry.markAsCompleted(
        transactionId,
        execution.txHash,
        execution.executedPrice
      );
      
      realtimeBroadcaster.notifyCompletion(
        transactionId,
        execution.txHash,
        execution.executedPrice,
        routing.selectedDex
      );
      
      console.log(`[Processing] ✓ COMPLETED\n`);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error(`[Processing] ✗ ERROR: ${errorMsg}`);
      
      await transactionRegistry.modifyTransaction(transactionId, { retryCount: retryCount + 1 });

      if (retryCount >= RETRY_LIMIT - 1) {
        await transactionRegistry.markAsFailed(transactionId, errorMsg, retryCount + 1);
        realtimeBroadcaster.notifyFailure(transactionId, errorMsg);
        console.log(`[Processing] ✗ PERMANENTLY FAILED\n`);
        throw error;
      }
      
      realtimeBroadcaster.emitUpdate(transactionId, "pending", { message: "Retrying..." });
      throw error;
    }
  }

  private pause(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async retrieveMetrics() {
    return await this.jobQueue.getJobCounts();
  }

  async terminate(): Promise<void> {
    if (this.backgroundWorker) {
      await this.backgroundWorker.close();
    }
    await this.jobQueue.close();
  }
}

export const transactionWorker = new TransactionWorker();
