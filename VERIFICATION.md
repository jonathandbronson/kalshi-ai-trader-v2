# V2 integrity pass verification

Status: **local software checks passed; live provider verification incomplete; NOT ready to freeze yet**.

## Changes and defects corrected

The previous pipeline reused the market snapshot fetched before forecasting. The new research-facing API and storage reads expose metadata and independent forecast history only. A durable immutable SQLite commit must complete before the fresh status and order-book requests. Quote failures retain the committed lock and can resume without another model call.

Earlier JSON read/modify/write operations could lose concurrent changes; forecasts overwrote history; paper entries could duplicate; invalid manual settlement could become a NO result; and scoring used trade wins rather than the real YES event. Those paths are replaced with transactional state, immutable versioned records, unique paper admission, official settlement and event-based forecast scoring. Generic official-source guidance and headlines no longer count as researched facts. Settlement polling skips finalized events to avoid unbounded repeated API work. Post-outcome forecasting and retrospective paper entry are prohibited.

The $1,000 bankroll, 8-point minimum edge, 12-point strong threshold and 3%-of-cash maximum are retained. No thresholds were fitted to past results. Additional conservative checks govern uncertainty, fees, liquidity, correlation, horizon and category exposure.

## Final automated results

- `npm ci --ignore-scripts --cache /workspace/.cache/kalshi-npm`: passed, reproducible pinned development dependencies.
- `npm test`: **60 passed, 0 failed, 0 skipped**, including the original 16 tests. Every test process uses isolated temporary storage and removes inherited live credentials.
- Coverage includes durable lock-before-quote ordering, pre-lock price-property traps, contamination attempts, immutable history and revisions, prevention of post-resolution forecasts and trades, malformed model/market responses, provider errors, API accounting/budget controls, book depth, duplicate entries, correlation/category caps, cash and fee accounting, official YES/NO outcomes, repeated/conflicting settlement, untraded forecast scoring, cross-process writes, restart recovery, migration and corrupt-state detection.
- `npm run test:e2e`: **2 passed, 0 failed**, real Chromium with 390×844 mobile emulation and 1280×900 desktop viewports. The mobile test exercises discovery → fetched report bodies → model → durable lock → fresh book → paper entry → official resolution → Brier/log-loss/calibration/cost displays. Desktop verifies persisted history, settled positions, audit detail and provider-error handling. No browser exceptions or horizontal overflow occurred.
- Browser providers and model responses are **fixtures**, with temporary databases and a fake credential. They are not live forecasts, physical iPhone/Safari tests, or benchmark observations.
- `npm audit`: **0 reported vulnerabilities**. This is a registry audit result, not a security proof.
- `git diff --check`: passed.
- Restarted `npm start` successfully and verified `/health`, dashboard assets, `/forecasts`, `/paper`, `/metrics` and `/audit` against the final running application. Health reports `realMoneyTrading:false`, `aiConfigured:false`, `PREPARATION`. Production forecast and resolved counts are both **0**.

## Genuine live paper-only evidence

Initial requests were blocked by the proxy. A subsequent retry reached the public Kalshi API successfully (HTTP 200). General discovery was dominated by combination markets; the verified `mve_filter=exclude` parameter and official-source series priority now reach simpler markets.

A representative live scan read **456 records over 6 pages**, rejected 368 in screening, grouped related contracts and returned two distinct driver candidates, including liquid September CPI and Federal Reserve contracts. Selection used resolution metadata, horizon and volume, without inspecting quote fields.

A real pipeline attempt for `KXCPI-26SEP-T0.5` used an isolated `/tmp` database. GDELT returned an upstream connection timeout/503. The pipeline returned **INSUFFICIENT_EVIDENCE** with 0 usable reports, **0 locked forecasts and 0 paper trades**. It did not reach the independent model or post-lock quote request. Both `TRADER_AI_KEY` and `OPENAI_API_KEY` were absent; no credential values were printed.

Consequently, genuine live **independent probability → durable lock → fresh order book → paper decision** is **unrun**, not passed. No live predictive skill or profitability claim is supported.

## Configuration and required user action

Saved the cloud draft's `install_script`, `start_skill`, required provider/research allowlist and `TRADER_AI_KEY` secret requirement for `api.openai.com`. Existing network presets were preserved. The reserved `OPENAI_API_KEY` name was not used for a new draft requirement; the application still supports an existing binding of that name.

Review/save the environment settings, enter the AI value securely, and publish the prepared configuration through the product. Draft persistence does not establish publication or credential injection. Kalshi connectivity was verified in the running instance; GDELT connectivity remains unreliable. Recheck that service after recovery and validate actual full-text source availability and publication timestamps. Then complete the live workflow in separate validation storage before freezing.

## Known limitations and freeze boundary

- Source contamination, syndication and correlation checks are conservative heuristics. They do not prove semantic independence in arbitrary prose or eliminate all shared real-world drivers. Review candidate/evidence quality.
- Research reads allowlisted public HTML bodies and category-specific plans. It is not a comprehensive set of specialist polling, weather, sports or economic-data adapters. Unavailable/paywalled/redirected/undated reports and missing counterevidence lead to rejection. Coverage must be assessed with live sources before freeze.
- Actual model availability, behavior and token billing have not been verified with the user's account. Cost rates must come from current published pricing; missing rates remain visibly unknown.
- Paper fee and fill assumptions are conservative approximations, not guaranteed execution. No slippage simulation or dynamic fee schedule is claimed. Nonbinary/void official results remain unresolved and candidate clauses allowing fair-price cancellation are excluded.
- The server is a local development app; expose it only through an authenticated gateway. It has no user account/authentication layer. SQLite integrity hashes detect accidental corruption and in-app mutation, not a filesystem attacker. Operational backups are required.
- Strategy label `v2-integrity-1`, exact source hash and strategy settings/model fingerprint are stored on each forecast; metrics separate fingerprints and count the first forecast per event. Legacy unversioned data is retained outside the benchmark. No automatic benchmark collection or freeze activation was added.

After the missing live checks pass, record the exact commit/fingerprint/model/settings, keep pre-freeze data separate, and deliberately start the fixed 200-unique-officially-resolved-forecast cohort (later 500). Do not tune this version further using early validation outcomes. This pass has not started that experiment and changes have not been pushed to GitHub.
