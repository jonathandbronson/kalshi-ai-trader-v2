# Kalshi AI Trader v2

A research-first prediction-market value assistant. It discovers open Kalshi markets, researches them independently, locks a probability estimate, and **only then** compares that estimate with the Kalshi executable price.

## V1 strategy

- Minimum estimated edge: **8 percentage points**
- Strong-value threshold: **12 percentage points**
- Starting paper bankroll: **$1,000**
- Maximum paper position: **3% of available cash**
- Validation target: **200–500 settled paper predictions**
- Real-money trading: **disabled / not implemented**
- Kalshi prices are excluded from the AI forecasting prompt to reduce anchoring.

This is a research and paper-trading tool, not a guarantee of profit. Forecasts can be wrong and estimated edge can disappear because of stale evidence, fees, spread, liquidity, model error, or resolution-rule interpretation.

## Run

Requires Node.js 20+.

1. Copy `.env.example` to `.env` or configure equivalent environment variables in your host.
2. For automatic AI probability estimates, set `OPENAI_API_KEY` in the runtime environment. Never commit it. Without a key, market scanning and evidence gathering still work, but the automatic probability step reports `EVIDENCE_READY`.
3. Run `npm start`.
4. Open `http://localhost:3000`.

No Kalshi credential is required for V1 because it only reads public market data and paper trades locally.

## Pipeline

`scan -> research plan -> external evidence -> independent AI forecast -> lock forecast -> fetch/use Kalshi quote -> edge filter -> rank -> paper trade -> settle -> calibration`

The external research layer uses GDELT-indexed reporting plus category-specific official-source guidance. Evidence is deduplicated and scored for source quality/freshness. The AI estimator is instructed to use only supplied evidence and resolution rules, never prediction-market prices.

## API

- `GET /health` — configuration/status
- `GET /scan` — open-market research queue
- `POST /pipeline/:ticker` — run research-first analysis
- `POST /gather/:ticker` — gather evidence without estimating
- `GET /research-plan/:ticker` — inspect planned source types
- `GET /opportunities` — ranked qualifying analyses
- `GET /paper` — persistent simulated portfolio
- `POST /paper/trades` — add a qualifying saved analysis to paper portfolio
- `POST /paper/settle/:id` — settle a paper trade with `{"outcome":"YES"}` or `NO`
- `GET /metrics` — win rate, Brier score, calibration, validation progress
- `GET /audit` — research/analysis counts

## Tests

Run `npm test`.

The test suite covers edge thresholds, YES/NO value selection, research contamination safeguards, evidence diversity, probability combination, and calibration primitives.

## Safety boundary

There is intentionally **no order-placement code** in V1. Adding authenticated Kalshi trading, secrets, or real-money execution is a separate phase and should include explicit order previews, bankroll limits, kill switches, and user authorization.
