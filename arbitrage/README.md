# Arbitrage Trader V1 (read-only prototype)

This branch develops cross-platform prediction-market arbitrage **instead of** AI event forecasting. Original application remains in place for reuse; new implementation lives in `arbitrage/`.

## Run

Requires Node.js 20+; public internet connectivity.

```bash
node --test arbitrage/*.test.js
node arbitrage/cli.js
node arbitrage/cli.js --watch
```

The CLI prints JSON containing counts, **unverified** market-match suggestions, evaluated opportunities, and API errors. It does not trade or store secrets. Default poll interval is 30 seconds; `ARB_POLL_MS` overrides it (minimum 5 seconds). `ARB_MARKET_LIMIT` controls the number of markets fetched from each exchange (default 100). Pagination and broad universe discovery are not implemented.

### Approved pairs

Matching titles is NOT proof of identical settlement. The scanner will not price a pair until a human has reviewed both contracts, their settlement sources, cutoff times, void/cancel behavior, and YES/NO mapping.

Set `ARB_APPROVED_PAIRS_FILE` to a local JSON array, for example:

```json
[
  {
    "kalshiTicker": "REPLACE_WITH_REAL_TICKER",
    "polymarketId": "REPLACE_WITH_REAL_MARKET_ID",
    "approved": true,
    "settlementReviewed": true,
    "yesMeansSameOutcome": true
  }
]
```

These fields are **operator attestations**, not machine verification. Never approve pairs based on title alone. Matching markets must appear in the currently fetched market batches. Polymarket Gamma market IDs and CLOB token IDs are distinct; the adapter resolves token IDs from Gamma market metadata.

## Assumptions and limitations

- Public Kalshi REST markets and order book; public Polymarket Gamma and CLOB book endpoints. Public data availability is not permission to trade.
- Kalshi best ask is inferred from opposite-side highest bid; Polymarket best ask comes from the CLOB ask side.
- Only top-of-book liquidity is checked. Partial depth, quantity-weighted fills, maker/taker fee schedules, slippage, network delays, market suspension, stale quotes, transfers, settlement disputes, and balance constraints are NOT fully modeled.
- `ARB_ESTIMATED_FEES_USD` is a manual total cost estimate per proposed pair; default zero is not suitable for real trade decisions.
- Both API responses may be incomplete or unavailable. Errors are included in output. Never interpret an empty result as proof that arbitrage does not exist.
- **No authenticated trading, no live execution, no guaranteed profits.** U.S. eligibility and API permissions require separate review.

## Next engineering tasks

Add cursor-based pagination, robust event/rule verification and audit logs, precise per-venue fee modeling, full executable depth VWAP, timestamp and latency safeguards, and a persistent paper-execution simulator before any live order integration.

## Paper simulation (synthetic or manually supplied depth)

Run from repository root:

```bash
node --test arbitrage/*.test.js
node arbitrage/paper-cli.js --demo
node arbitrage/paper-cli.js --settle paper-1
```

The demo is SYNTHETIC and does not represent actual opportunities. It starts with $1,000, caps a paper position at 3% of initial bankroll, walks ask depth to compute a volume-weighted fill, reserves configurable fees/slippage, and persists state to `arbitrage-paper-state.json`. The file is local; do not commit it. To stress-test mismatched resolutions use `--settle paper-1 --mismatch`, or `--void` for conservative zero-recovery void stress. These are hypothetical outcomes, not verified exchange settlements.

For custom paper inputs, create a local JSON file shaped like `arbitrage/fixtures.js`'s `synthetic` object and set `ARB_PAPER_INPUT` to its path. The `approved` field is a human assertion, not independent proof of equivalence.

**Current boundary:** The live scanner's top-of-book output is NOT yet wired into the depth-aware simulator. The paper runner consumes synthetic or user-supplied depth snapshots. It does not automatically paper-trade live exchange opportunities. The code has been committed but runtime tests and live endpoint checks still need execution in a network-enabled Node environment.

## Current live-paper safety requirements

This branch remains **paper-only**. The live-paper runner requires each approved pair to contain `settlementEvidenceVerified:true` in addition to `approved`, `settlementReviewed`, and `yesMeansSameOutcome`. All four flags are **manual operator attestations**, not independent cryptographic or semantic proofs. The engine will not evaluate a live-paper pair without explicit `kalshiFeeModel` and `polymarketFeeModel` objects. Examples of **illustrative, not verified current rates**:

```json
{"kalshiFeeModel":{"type":"kalshi_taker","coefficient":0.07},"polymarketFeeModel":{"type":"flat_rate","rate":0.02}}
```

The `kalshi_taker` model estimates a nonlinear per-level fee and rounds each consumed price level upward to the nearest cent. Real fee schedules may vary by product, account, order type, and time; do not treat the sample coefficients as authoritative. The `flat_rate` model is a user-supplied assumption, **not** a verified Polymarket fee schedule. Revalidate fees before each review. The minimum modeled net ROI is 2% by default and configurable with `ARB_MIN_NET_ROI`. No simulated entry is permitted with insufficient depth, missing manual settlement evidence, or missing explicit venue fee models. `stressPartialFill` estimates worst-case unmatched-leg exposure but does not execute or hedge orders. No live orders are implemented.

## Verified-pair watchlist and spread measurement

Cross-exchange arbitrage remains the **only** strategy in this branch. No single-exchange statistical trading or probability forecasting has been added.

Discovery reports contain **unverified research candidates**, not trade-ready pairs. The manually reviewed watchlist is `arbitrage/approved-pairs.json`, deliberately initialized to `[]`. Add a pair only after independently confirming identical outcome definitions, deadlines, cancellation/void rules, source hierarchy, contract/token IDs, and current fee assumptions. Set the four approval/evidence flags only after real human review; setting a flag alone is not proof.

```bash
node --test arbitrage/*.test.js
node arbitrage/spread-observer-cli.js
```

The observer never places orders or creates paper positions. It measures **both** cross-venue directions for verified watchlist pairs and records positive, negative, and insufficient-depth observations. The **research threshold is 0%** so small or negative spreads can be measured; the existing paper-entry threshold remains **2% by default**. The scheduled discovery workflow publishes `reports/latest-spread-observations.json` when the observer runs. With an empty verified watchlist, the report correctly shows zero observations; it does not claim opportunities.

Before judging viability, assemble a manually verified watchlist across categories, monitor spreads over multiple days, then evaluate executable depth, fees, book freshness, and unhedged-leg stress. Neither similar titles nor a positive theoretical spread establishes a risk-free arbitrage.
