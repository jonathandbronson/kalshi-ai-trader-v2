export const config = Object.freeze({
  minEdge: Number(process.env.MIN_EDGE ?? 0.08),
  strongEdge: Number(process.env.STRONG_EDGE ?? 0.12),
  simulatedBankroll: Number(process.env.SIMULATED_BANKROLL ?? 1000),
  maxFractionPerTrade: Number(process.env.MAX_FRACTION_PER_TRADE ?? 0.03),
  port: Number(process.env.PORT ?? 3000)
});
