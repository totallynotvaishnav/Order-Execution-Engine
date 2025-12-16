import { TransactionRegistry } from "../src/modules/transactions/transaction-registry";

describe("TransactionRegistry", () => {
  let registry: TransactionRegistry;

  beforeEach(() => {
    registry = new TransactionRegistry();
  });

  test("registerTransaction creates unique transaction IDs", async () => {
    const transaction1 = await registry.registerTransaction({
      tokenIn: "SOL",
 tokenOut: "USDC",
      amount: 100,
    });
    const transaction2 = await registry.registerTransaction({
      tokenIn: "SOL",
      tokenOut: "USDC",
      amount: 100,
    });
    expect(transaction1.id).not.toBe(transaction2.id);
    expect(transaction1.status).toBe("pending");
  });

  test("findTransaction returns registered transaction", async () => {
    const transaction = await registry.registerTransaction({
      tokenIn: "SOL",
      tokenOut: "USDC",
      amount: 100,
    });
    const found = await registry.findTransaction(transaction.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(transaction.id);
  });

  test("updateState changes transaction status", async () => {
    const transaction = await registry.registerTransaction({
      tokenIn: "SOL",
      tokenOut: "USDC",
      amount: 100,
    });
    const updated = await registry.updateState(transaction.id, "confirmed");
    expect(updated.status).toBe("confirmed");
  });

  test("markAsCompleted sets transaction hash and price", async () => {
    const transaction = await registry.registerTransaction({
      tokenIn: "SOL",
      tokenOut: "USDC",
      amount: 100,
    });
    const confirmed = await registry.markAsCompleted(transaction.id, "tx_123", 50.5);
    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.txHash).toBe("tx_123");
    expect(confirmed.executedPrice).toBe(50.5);
  });

  test("validateTransactionRequest throws on invalid input", () => {
    expect(() => {
      registry.validateTransactionRequest({
        tokenIn: "",
        tokenOut: "USDC",
        amount: 100,
      });
    }).toThrow();
  });
});
