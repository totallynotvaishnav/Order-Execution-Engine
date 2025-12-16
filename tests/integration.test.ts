import { TransactionWorker } from "../src/workers/transaction-worker";
import { transactionRegistry } from "../src/modules/transactions/transaction-registry";

describe("Integration Test", () => {
  test("full transaction lifecycle", async () => {
    const worker = new TransactionWorker();
    await worker.initialize();

    const transaction = await transactionRegistry.registerTransaction({
      tokenIn: "SOL",
      tokenOut: "USDC",
      amount: 100,
    });

    await worker.enqueueTransaction(transaction);

    const found = await transactionRegistry.findTransaction(transaction.id);
    expect(found?.status).toBe("pending");
    expect(found?.id).toBeDefined();
  });

  afterAll(async () => {
    // Cleanup
  });
});
