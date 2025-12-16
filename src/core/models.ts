// Transaction lifecycle states
export type TransactionState = 
  | 'pending' 
  | 'routing' 
  | 'building' 
  | 'submitted' 
  | 'confirmed' 
  | 'failed';

export type TransactionType = 'market' | 'limit' | 'sniper';
export type ExchangePlatform = 'raydium' | 'meteora';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  tokenIn: string;
  tokenOut: string;
  amount: number;
  status: TransactionState;
  selectedDex?: ExchangePlatform;
  executedPrice?: number;
  txHash?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
}

export interface PriceQuotation {
  dex: ExchangePlatform;
  price: number;
  fee: number;
  estimatedOutput: number;
  timestamp: Date;
}

export interface ExchangeSelectionResult {
  selectedDex: ExchangePlatform;
  quote: PriceQuotation;
  reason: string;
}

export interface SwapCompletionData {
  txHash: string;
  executedPrice: number;
  finalAmount: number;
  dex: ExchangePlatform;
  timestamp: Date;
}

export interface RealtimeNotification {
  transactionId: string;
  status: TransactionState;
  data?: {
    selectedDex?: ExchangePlatform;
    executedPrice?: number;
    txHash?: string;
    errorMessage?: string;
    progress?: string;
  };
  timestamp: Date;
}

export interface WorkerTask {
  transactionId: string;
  retryCount: number;
  lastError?: string;
}

export interface TransactionSubmission {
  tokenIn: string;
  tokenOut: string;
  amount: number;
  slippage?: number; // percentage for acceptable slippage, defaults to 0.5%
}

export interface TransactionResponse {
  transactionId: string;
  status: TransactionState;
  message: string;
}

// Custom error type for validation failures
export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestValidationError';
  }
}
