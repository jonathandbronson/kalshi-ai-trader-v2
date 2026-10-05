# Hardened V2 verification — 2026-10-05

## Runtime

- Replit update completed; the sole application workflow runs Node 24.13.0.
- Application version: `v2-integrity-1`.
- Application fingerprint: `cdebeb491093dd869dd96827a25765540676229fdcfa1fa30829b2540b1aaaf6`.
- Application sources, public assets and package manifests remain identical to `work` commit `29f7f5a09afdac9b3f3d6c380d8e6f1d2b1b2aef`.
- Checkout HEAD at verification: `62a55bb9ff9f22851a033d8fe4868fd70f16edb3`; subsequent changes contain runtime setup/documentation, not strategy changes.
- Proxied health returns 200, PREPARATION, AI configured and real-money trading false. Preview was visually verified during runtime setup; no application source changes invalidate that check.
- Preparation database: `data/v2-preparation.sqlite`; no legacy migration. Legacy JSON checksum remains `ac27f22e96a8ace7a0d18e70e22624d859da8c2cb0d6acc2ed6a3ae1089da766`.

## Credential preflight

Authenticated, non-generating HTTPS requests to the approved OpenAI host returned:

- `GET /v1/models`: 200; configured model listed.
- `GET /v1/models/gpt-6-luna`: 200.

This confirms credential authentication and model-catalogue access, not successful Responses generation, available billing credits, or generation pricing. No credential value or provider error message containing credentials was recorded. No credential binding was changed.

## Automated checks

- `npm test`: 60 passed, 0 failed, 0 skipped.
- `CHROMIUM_PATH=/repl/tools/bin/chromium npm run test:e2e`: 2 passed.
- Test databases are isolated; providers/model responses in browser tests are fixtures. Simulated paper entry and final resolution in those tests are not genuine live evidence.

## Genuine live attempt

Database: `/tmp/v2-live-final-f7lNj2/validation.sqlite`, separate from preparation and legacy storage.

- Discovery: 1 successful Kalshi page, 44 raw records, no provider errors, one selected independent driver.
- Candidate: `KXCPI-26SEP-T0.5`, September 2026 CPI exceeding 0.5%.
- Metadata retrieval succeeded.
- GDELT discovery failed after 3 attempts.
- Pipeline returned `INSUFFICIENT_EVIDENCE`, with 0 usable reports and an explicit incomplete-counterevidence-search warning.
- Final validation state: PREPARATION; 0 forecasts, 0 evaluations, 0 paper positions, 0 OpenAI generation calls.
- No benchmark was activated. No quotes were evaluated before a lock and none were evaluated in this rejected attempt.

## Remaining blockers

- GDELT discovery remains unavailable; do not bypass its required counterevidence gate.
- BLS CPI report returned 403.
- Federal Reserve monetary-release feed returned 200, but the sampled release failed the existing substantive-body extractor with `Article body unavailable`. HTTP reachability alone does not establish usable researched evidence.
- The full genuine probability → durable SQLite lock → fresh order book → paper decision remains unverified.
- Model generation/account billing and deliberate pricing/cost controls remain unverified; absent rates must not be replaced with invented estimates.
- Official live final settlement remains unverified. Fixture tests cover it, but no live result was fabricated.

Research restrictions, model, strategy, 8pp/12pp thresholds, $1,000 bankroll and 3%-cash maximum remain unchanged. The system is not ready to claim a completed genuine live pass or predictive skill.
