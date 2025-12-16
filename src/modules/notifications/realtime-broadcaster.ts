import { WebSocket } from "@fastify/websocket";
import { ExchangePlatform, TransactionState, RealtimeNotification } from "../../core/models";

export class RealtimeBroadcaster {
  private activeChannels: Map<string, Set<WebSocket>> = new Map();

  subscribeClient(transactionId: string, ws: WebSocket): void {
    if (!this.activeChannels.has(transactionId)) {
      this.activeChannels.set(transactionId, new Set());
    }
    
    this.activeChannels.get(transactionId)!.add(ws);
    console.log(`[WS] Client subscribed to transaction ${transactionId}`);

    ws.on("close", () => {
      const channelSet = this.activeChannels.get(transactionId);
      if (channelSet) {
        channelSet.delete(ws);
      }
    });

    ws.on("error", (error: any) => {
      console.error(`[WS] Connection error:`, error);
    });
  }

  emitUpdate(transactionId: string, status: TransactionState, data?: any): void {
    const notification: RealtimeNotification = {
      transactionId,
      status,
      data,
      timestamp: new Date(),
    };

    const subscribers = this.activeChannels.get(transactionId);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const payload = JSON.stringify(notification);
    
    for (const ws of subscribers) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(payload);
        } catch (error) {
          console.error(`[WS] Failed to send message:`, error);
        }
      }
    }

    console.log(`[WS] Emitted ${status} to ${transactionId}`);
  }

  notifyExchangeSelection(transactionId: string, selectedDex: ExchangePlatform): void {
    this.emitUpdate(transactionId, "routing", {
      selectedDex,
      message: `Selected ${selectedDex}`,
    });
  }

  notifyPreparation(transactionId: string): void {
    this.emitUpdate(transactionId, "building", {
      message: "Building transaction...",
    });
  }

  notifyBroadcast(transactionId: string): void {
    this.emitUpdate(transactionId, "submitted", {
      message: "Submitted to blockchain",
    });
  }

  notifyCompletion(
    transactionId: string,
    txHash: string,
    executedPrice: number,
    dex: ExchangePlatform
  ): void {
    this.emitUpdate(transactionId, "confirmed", {
      selectedDex: dex,
      executedPrice,
      txHash,
      message: "Transaction executed!",
    });
  }

  notifyFailure(transactionId: string, errorMessage: string): void {
    this.emitUpdate(transactionId, "failed", {
      errorMessage,
      message: "Transaction failed",
    });
  }

  countActiveSubscriptions(): number {
    let total = 0;
    
    for (const channelSet of this.activeChannels.values()) {
      total += channelSet.size;
    }
    
    return total;
  }

  disconnectAllClients(): void {
    for (const subscribers of this.activeChannels.values()) {
      for (const ws of subscribers) {
        if (ws.readyState === ws.OPEN) {
          ws.close();
        }
      }
    }
    
    this.activeChannels.clear();
  }
}

export const realtimeBroadcaster = new RealtimeBroadcaster();
