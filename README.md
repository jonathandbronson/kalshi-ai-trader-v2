# Kalshi AI Trader v2

An independent forecasting and **paper-only** prediction-market research tool. There is no real order client, authenticated Kalshi trading, or order-submission route.

This is the final V2 integrity pass, strategy label `v2-integrity-1`. It remains in **PREPARATION**. The validation experiment has not started, and software verification does not demonstrate forecasting skill or profitability.

## Development

Requires **Node 24.5+** for built-in SQLite and environment-proxy support; verified on 24.19.0. Browser checks require Chromium (`/usr/bin/chromium` or `CHROMIUM_PATH`).

```sh
npm ci --ignore-scripts
npm test
npm run test:e2e
NODE_USE_ENV_PROXY=1 npm start
```

The server binds to `127.0.0.1:3000` by default. Set `HOST` only when an authenticated deployment gateway protects the app. This local development server does not implement user authentication; do not expose it directly to the Internet. Mutation requests require JSON and reject cross-origin browser requests. No credentials are returned by the API.

Node does not automatically load `.env`. If configuring an ignored local file, preserve existing values and use:

```sh
NODE_USE_ENV_PROXY=1 node --env-file=.env src/server.js
```

`TRADER_AI_KEY` is the supported cloud secret alias for the OpenAI Responses API; existing `OPENAI_API_KEY` bindings also work. Enter credentials only in secure environment settings. `OPENAI_MODEL` retains the repository's default `gpt-6-luna`; availability must be verified with the actual account. No Kalshi credentials are needed.

Network destinations: `external-api.kalshi.com`, `api.gdeltproject.org`, `api.openai.com`, and the supported authoritative/reporting domains in `src/articles.js`. Preserve the platform proxy and CA configuration. Browser tests use isolated fixtures; they never contact these providers or write production data.

## Independent pipeline

1. Discover metadata, screen resolution clarity, horizon, liquidity and event duplication. No quote-based ranking. CPI, Federal Reserve and NYC temperature series are screened before general discovery; multi-event contracts are excluded through the public API filter. Liquidity selects between related contracts, and longer horizons lower candidate priority.
2. Project a metadata-only object from the public market API response. Price/order-book properties are never read by this projection and are never supplied to research or the model. The public endpoint itself includes price fields; there is no claim of a separate metadata-only upstream endpoint.
3. Research event-specific support and counterevidence. GDELT supplies leads; headlines and generic instructions are **not** evidence. Read actual article bodies only from an HTTPS source allowlist, preserve content hashes and publication times, reject contaminated or stale content, and discount duplicated reports and shared NOAA/NWS provenance.
4. Independently estimate probability, interval, confidence, rationale, YES case, NO case, unknowns, justified reference-class reasoning, and evidence IDs. Missing/invalid fields, unsupported citations, and unsupported extreme confidence reject the forecast.
5. Commit an immutable forecast with evidence, model/prompt metadata, exact criteria (operator branding is neutralized in model text, with the original rules separately preserved), timestamps, strategy settings, source-code fingerprint and strategy fingerprint to SQLite (`synchronous=FULL`).
6. Only after commit, request fresh market status and order-book bids. Infer executable asks from the opposite-side bids and retain available top-level quantity and timestamps.
7. Calculate edge with conservative execution assumptions. Qualify only if liquidity, spread, timing and evidence checks pass and the uncertainty bound still retains the minimum edge after estimated fees.
8. A separate explicit user action creates a PAPER position from the persisted evaluation. No automatic trading or benchmark collection starts on boot.

Known text/URL/key contamination is rejected, including Kalshi/Polymarket and betting probabilities, Unicode-obfuscated names, and quote fields. This is a conservative lexical defense plus a metadata boundary and model instructions; it is not a proof that every possible semantic paraphrase of market information can be detected. Correlation detection is also conservative and heuristic. Review candidates and sources when assembling the benchmark.

## Benchmark rules and accounting

- Initial bankroll: **$1,000**.
- Minimum edge: **8 percentage points**; strong value: **12 points**.
- Maximum position: **3% of available cash**, including estimated fees.
- Integer contracts, capped at displayed opposing-book quantity.
- Estimated fee: `ceil(0.07 × price × (1-price) × 100) / 100` per contract. This conservative paper assumption is recorded; it is not a live fee-schedule guarantee and does not model slippage or actual fills.
- One paper entry per forecast/ticker. Reject shared event/driver exposure. Driver reuse is allowed only after previous forecasts are officially resolved; repeated monthly/daily events are not permanently banned. Category exposure is capped at **$100** of open stakes.
- Open positions are carried at cost, not marked to executable liquidation value.
- Manual YES/NO settlement is removed. Official market status `settled`/`finalized` and result `yes`/`no` are required. Unsupported results (including nonbinary/void outcomes), provider failures and conflicting results stay unresolved rather than inventing payouts.

Official settlement is checked every five minutes while the server runs and can be requested through the dashboard. Automatic monitoring requests only unresolved events and open trades; it does not poll hundreds of already resolved events every five minutes. An explicit reconciliation call can opt into rechecking final results. Monitoring settles all versions of the event and all associated paper positions in one transaction. Repeated checks cannot pay a position twice.

## Durable storage and history

The default store is ignored `data/state.sqlite`, with SQLite WAL and transactional updates across processes. Back up a running database with SQLite's backup facilities; copying only the main file while WAL is active is unsafe. A cold backup must include/checkpoint WAL first.

Legacy `data/state.json` is retained unchanged. An explicit `DATA_PATH=...json` uses a sibling `...json.sqlite`. Legacy unversioned research and trades remain excluded from the forecast benchmark. Empty audit histories gain an empty anchor without adding events. Nonempty unsealed histories fail closed and require an explicit, separate validation-copy retrofit; they are never silently rehashed. Corrupted JSON/database state blocks operations rather than silently resetting the bankroll or forecast history.

Forecasts, quote evaluations and official resolutions have integrity hashes and cannot be edited through storage transactions. Hashes detect accidental corruption; they are not signatures against an attacker with filesystem access. Revisions require an explicit new forecast ID linked to the previous version. The default UI reuses a committed lock, including recovery after a quote failure. Expired quotes can be refreshed without changing the locked probability; old evaluations remain intact. A changed strategy fingerprint requires an explicit new version and is not mixed into the current scoring cohort.

Audit events have deterministic canonical-JSON SHA-256 hashes, monotonically increasing sequence numbers and previous-event hash links. A persisted count/head anchor is checked on startup and every read/write. Transactions reject changes to any existing audit prefix or anchor and seal only newly appended events, in the same durable commit as associated records. The original forecast/evaluation/resolution hash format remains unchanged. This detects corruption and prevents application-level rewriting, deletion and reordering; it is not a signature or protection against an administrator replacing an entire database and recomputing all hashes.

To preserve a historical validation ledger, use `node scripts/upgrade-validation-audit.mjs SOURCE NEW_VALIDATION_COPY`. The source is read-only, the destination must be new and validation-named, and the copy includes an explicitly retroactive import event with source-state/audit digests. This does not establish that old events were hash-protected at their original creation time. Never copy validation records into benchmark/preparation storage. See `runtime/benchmark-freeze.md` for the verified control manifest and historical audit anchor.

## Scoring and costs

Every locked forecast can be officially scored, including forecasts rejected for paper trading. Score **P(YES) versus the official YES outcome**, independently of which side was traded. Metrics include Brier score, log loss (numerical floor `1e-15`), calibration with bucket sample sizes, accuracy, category/model/evidence/horizon groups, and per-forecast expected edge versus realized contract result. Revisions do not inflate independent-observation counts; the earliest forecast per event and exact strategy fingerprint defines the cohort.

Cheap screening makes no model calls. Deep research concurrency is limited to two in one server process; duplicate in-flight requests coalesce. Durable commit checks also prevent cross-process duplicate locks. Across processes the model request budget and six-request-per-minute limit are transactional. Successful locked research is reused; stale research is not carried into a newly requested revision. There is no automatic rerun to manufacture opportunities.

`MAX_API_REQUESTS` defaults to 600 lifetime OpenAI logical calls, enough for the 200–500 observation experiment with limited failures. Set a deliberate budget before freezing. Model POSTs are not automatically retried, avoiding duplicate charges after uncertain failures. Read-only JSON requests have bounded retries and timeouts. Article reads are limited in count, size, redirects and duration.

Public Kalshi and GDELT requests and model requests are all recorded. Requests, stages, provider/model, tokens when supplied, outcomes and forecast associations are recorded. Model cost is **unknown** unless current published input/output rates are supplied through `MODEL_INPUT_USD_PER_MILLION` and `MODEL_OUTPUT_USD_PER_MILLION`. Optional `MAX_API_COST_USD` reserves a conservative character-based upper bound before a call and fails closed when rates are unknown. Uncertain failed calls retain their cost reservation. Estimates are not invoices or guarantees about changing provider pricing.

## API

- `GET /health`, `/scan`, `/research-plan/:ticker`
- `POST /gather/:ticker`, `/pipeline/:ticker`
- `GET /forecasts`, `/opportunities`, `/paper`, `/metrics`, `/audit`
- `POST /paper/trades` with `{"ticker":"..."}` and optional smaller `fraction`
- `POST /settlements/check` with `{}`

POST requests require `Content-Type: application/json`. There is no `/orders`, arbitrary `/state` dump, or manual settlement endpoint.

## Freeze checklist

See [VERIFICATION.md](VERIFICATION.md) for checks and live blockers. Before freezing, enable the saved provider/research network destinations, bind the AI credential securely, and complete a genuine live **paper-only** run in an isolated validation database. Confirm that actual official rules, publication formats, current model responses and order-book formats work. Fixtures do not establish those facts.

Record the exact Git commit, strategy fingerprint, model, budget and paper assumptions. Retain pre-freeze data separately, begin a new benchmark cohort deliberately, and keep rules fixed while accumulating 200 unique officially resolved events (later 500). Do not tune thresholds or judge skill from tiny samples.
