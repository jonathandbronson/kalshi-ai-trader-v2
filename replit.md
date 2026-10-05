# Hardened V2 runtime

- Keep the application sources and strategy from the hardened `work` version unchanged during runtime work.
- Node 24.5+ is required for built-in SQLite. The Replit module is `nodejs-24`.
- The `Start application` workflow runs `HOST=0.0.0.0 PORT=5000 DATA_PATH=./data/v2-preparation.sqlite node runtime/replit.mjs`.
- The Replit-only startup wrapper permits dashboard framing by self and `https://replit.com`; all other application CSP restrictions remain intact. Standalone `npm start` keeps the original CSP.
- Keep the app in PREPARATION. Do not start the benchmark or create paper positions without explicit authorization.
- Preserve `OPENAI_API_KEY` in Secrets. The hardened app supports it; do not rename, print, copy into files, or remove it.
- Do not migrate the legacy JSON ledger during runtime setup. The non-default preparation SQLite path deliberately avoids the application's default legacy migration.
- Genuine live verification must use a separate, explicitly selected validation SQLite path, not the preparation/benchmark database. Do not reuse the previous JSON version's verification results as proof of this hardened version.
- Do not weaken research source allowlisting, contamination checks, HTTPS requirements, or insufficient-evidence rejection to work around provider failures.
- Real-money execution must remain absent/disabled. Keep the $1,000 bankroll, 8pp minimum edge, 12pp strong edge and 3% maximum available-cash position unchanged.
- Latest retrieval/live verification is recorded in `runtime/verification.md`; isolated validation paper positions must never be copied into preparation or benchmark storage.
