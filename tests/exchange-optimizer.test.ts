import { SimulatedExchangeOptimizer } from "../src/modules/exchange/price-optimizer";

describe("Exchange Optimizer", () => {
  let optimizer: SimulatedExchangeOptimizer;

  beforeEach(() => {
    optimizer = new SimulatedExchangeOptimizer();
  });

  test("fetchRaydiumPricing returns valid quotation", async () => {
    const quotation = await optimizer.fetchRaydiumPricing("SOL", "USDC", 10);
    expect(quotation.dex).toBe("raydium");
    expect(quotation.price).toBeGreaterThan(0);
    expect(quotation.fee).toBe(0.003);
  });

  test("fetchMeteoraPricing returns valid quotation", async () => {
    const quotation = await optimizer.fetchMeteoraPricing("SOL", "USDC", 10);
    expect(quotation.dex).toBe("meteora");
    expect(quotation.price).toBeGreaterThan(0);
    expect(quotation.fee).toBe(0.002);
  });

  test("retrieveAllPrices fetches from both exchanges", async () => {
    const quotations = await optimizer.retrieveAllPrices("SOL", "USDC", 10);
    expect(quotations).toHaveLength(2);
    expect(quotations[0].dex).toBe("raydium");
    expect(quotations[1].dex).toBe("meteora");
  });

  test("determineOptimalExchange selects best exchange", () => {
    const quotations = [
      {
        dex: "raydium" as const,
        price: 100,
        fee: 0.003,
        estimatedOutput: 1000,
        timestamp: new Date(),
      },
      {
        dex: "meteora" as const,
        price: 101,
        fee: 0.002,
        estimatedOutput: 1010,
        timestamp: new Date(),
      },
    ];
    const result = optimizer.determineOptimalExchange(quotations);
    expect(result.selectedDex).toBe("meteora");
  });

  test("performTokenSwap returns swap completion data", async () => {
    const result = await optimizer.performTokenSwap("raydium", 100);
    expect(result.txHash).toBeDefined();
    expect(result.executedPrice).toBeGreaterThan(0);
  });
});
