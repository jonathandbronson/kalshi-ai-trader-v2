# Hardened V2 retrieval and live verification — 2026-10-05

## Status

The requested retrieval/infrastructure hardening and genuine forecast → durable lock → fresh quote → naturally qualifying paper-entry verification passed. The app remains **PREPARATION**. The 200-forecast benchmark is neither started nor frozen.

Node: **24.13.0**. Application version: `v2-integrity-1`.

Verified application fingerprint: `fa3187513b8554436335938136220bd2f201f2a6b0521e34602cd754c88ecc2c`.

The hardened baseline was commit `29f7f5a09afdac9b3f3d6c380d8e6f1d2b1b2aef`; subsequent changes are retrieval/parser/network infrastructure, regression coverage, runtime setup and documentation. Do not describe the final source as identical to that earlier commit.

## Corrections

- GDELT calls/retries reserve request slots at least 5.1 seconds apart. GET retries respect Retry-After or reject cooldowns exceeding the bounded retry budget. Paid POSTs remain single-attempt.
- If GDELT fails, bounded economic research discovery uses legitimate public feeds from the already-approved BLS, Federal Reserve and BBC organizations. Feed headlines remain discovery leads, never sufficient evidence.
- A blocked BLS CPI release can use the matching dated official Atom content. It is explicitly labeled an official release excerpt, with canonical URL, actual publication time and content hash. Unmatched archive requests fail; there are no cookies, challenge solving or access-control bypasses.
- Federal Reserve nested article containers and publication headings are supported. Nested HTML bodies are balanced without navigation/footer contamination or quadratic scanning.
- HTTPS/host restrictions, no-redirect retrieval, bounded bodies, entity/DOCTYPE rejection, publication provenance, existing category freshness, source deduplication and contamination validation remain enforced.
- Fallback acceptance requires independent substantive sources and completed counterevidence scanning. Retrieval/search outcomes are recorded before forecasting.
- Live transport exposed an HTTP 400 input-format rejection in JSON-object mode. An explicit `responseFormat: "JSON"` input marker repeats the existing output instruction; model, forecast instructions, validation and strategy are unchanged.
- Provider diagnostics expose bounded status/code/type/parameter fields and fixed classifications, not arbitrary provider messages or credential text.

## Automated results

- **75 backend tests passed**, 0 failed, 0 skipped, including 15 new retrieval/infrastructure regressions.
- **2 fixture-based browser tests passed**, covering mobile and desktop end-to-end flows.
- Fixtures use temporary databases and fake credentials. Their paper trades and payouts are not genuine live evidence.
- The unchanged strategy remains: $1,000 bankroll, 8pp minimum edge, 12pp strong edge and maximum 3% available-cash position.

## Genuine live verification

Separate database: `/tmp/v2-final-live-iMb2jR/validation.sqlite`. This is not the preparation or benchmark ledger.

- Live discovery previously succeeded with 44 records and selected `KXCPI-26SEP-T0.5`.
- Substantive evidence: the dated BLS CPI release excerpt and two Federal Reserve release bodies, representing **two source organizations**, with original publication provenance. No headline-only evidence was used. Organization diversity does not establish statistical independence of underlying data.
- Required counterevidence scan completed and was audited despite GDELT still failing.
- Genuine `gpt-6-luna` forecast: **P(YES) = 0.22**, interval **0.08–0.42**, confidence **0.30**.
- Forecast locked at **2026-10-05T23:11:30.493Z**.
- New status/order-book request began at **23:11:30.500Z**, after durable commit. Quote completed at **23:11:30.939Z**.
- Fresh executable asks: YES **0.61**, NO **0.40**; displayed NO availability **900 contracts**.
- Unchanged rules naturally classified NO as strong value. A **44-contract NO paper position** cost **$18.48**, including estimated fees of **$0.02 per contract**. No probability, threshold, uncertainty or sizing input was altered to obtain a fill.
- Exactly one successful generation in this validation database: **967 input + 994 output = 1,961 tokens**. Cost remains unknown because published pricing was not configured; no invented dollar estimate is supplied.
- A separate process reopened SQLite and verified forecast/evaluation hashes, current source/strategy fingerprints, lock-before-quote timestamps, quote depth, the cash cap, record associations and ordered `EVIDENCE_SEARCH → FORECAST_LOCKED → QUOTE_EVALUATED → PAPER_ENTRY` audit records.
- Two earlier isolated attempts stopped at provider HTTP 400 without locks, quote access or positions. They remain separate from the successful database; failures were not retried automatically.

## Preservation and remaining limitations

- Preparation database `data/v2-preparation.sqlite`: PREPARATION, 0 forecasts, 0 positions, 0 provider calls. Its cash remains $1,000.
- Legacy JSON checksum remains `ac27f22e96a8ace7a0d18e70e22624d859da8c2cb0d6acc2ed6a3ae1089da766`; no migration or replacement occurred.
- Credentials are preserved securely. Real-money execution remains absent/disabled.
- GDELT remains intermittently unavailable/rate-limited and canonical BLS pages can still return 403. The verified public alternatives resolve the tested economic research path, not every possible category.
- Unsupported/unavailable sources, missing dates, insufficient independent evidence or incomplete fallback counterevidence still fail closed.
- Official final live settlement is pending; no result or payout was fabricated. Fixture tests cover final settlement.
- Generation succeeded, but deliberate pricing/cost controls still need reviewed configuration before a long-running experiment. No budgets were increased.
- This verifies implementation and operation, not predictive skill, profitability or interval coverage. Benchmark activation remains a separate explicit user decision.
