# Live-data paper simulation (experimental, no order placement)

From the repository root with Node.js 20+:

```bash
node --test arbitrage/*.test.js
ARB_APPROVED_PAIRS_FILE=approved-pairs.json node arbitrage/paper-live-cli.js
ARB_APPROVED_PAIRS_FILE=approved-pairs.json node arbitrage/paper-live-cli.js --watch
```

Use a **local, non-committed** `approved-pairs.json` array of records shaped like:

```json
[{"id":"unique-pair-1","kalshiTicker":"REPLACE","polyYesTokenId":"REPLACE_NUMERIC_TOKEN","polyNoTokenId":"REPLACE_NUMERIC_TOKEN","approved":true,"settlementReviewed":true,"yesMeansSameOutcome":true}]
```

Token IDs are Polymarket CLOB outcome token IDs, not Gamma market IDs. Review the exact exchange contracts, resolution criteria, deadlines, cancellation behavior, and payout equivalence independently before approval. This is **manual attestation**, not automated verification. The simulator reads both sides of the Kalshi order book and Polymarket CLOB asks, computes a depth-weighted hypothetical purchase, applies configurable fee and latency-slippage reserves, enforces a $1,000 paper bankroll with a 3% position limit, prevents repeated open positions per pair/direction, and saves local paper state.

Defaults: `ARB_QUANTITY=10`, `ARB_FEE_RATE=.02` on each leg, `ARB_SLIPPAGE_CENTS=1` per leg, `ARB_POLL_MS=30000`. Fees are **illustrative**, not venue fee schedules. Positions are not automatically settled or marked to market. Public API data access is not authorization to trade. No real orders or credentials are used.

**Validation status:** Code and fixture-based tests have been written; local equivalent mock-integration tests passed 5/5. The complete GitHub branch suite and live network endpoints have not been executed successfully in this environment. Check these before treating the scanner as operational. Quotes from separate endpoints are not atomic or guaranteed executable. Do not interpret paper P&L as actual earnings.
