# V2 benchmark control manifest — 2026-10-05

Intended annotated Git tag: **v2-benchmark**. Resolve the tag to obtain the exact final commit; this document does not embed a self-referential commit hash. No benchmark collection or real-money execution is authorized by the tag.

## Verified final control

- Source fingerprint: `86a8aeddeb4c276c650ef94810bd502e67de8929f6c8b876565813feb2222550`
- Strategy fingerprint: `34471ed28b71fa118405aed2145c0fac581ee2c0dc90c8527845d7728d8a023b`
- Strategy label: `v2-integrity-1`; model ID: `gpt-6-luna`
- Runtime observed: Node **24.13.0**; sole Replit module: `nodejs-24`
- Workflow: `HOST=0.0.0.0 PORT=5000 DATA_PATH=./data/v2-preparation.sqlite node runtime/replit.mjs`
- Initial paper bankroll: **$1,000**; minimum edge **8pp**; strong edge **12pp**; position cap **3% of available cash**, including estimated fees
- Existing paper fee/depth/uncertainty/correlation rules unchanged
- Existing logical model-request cap: **600**, six requests/minute, two concurrent research pipelines; no paid POST retries or budget increases
- Credential destination remains approved HTTPS OpenAI; credential values are not part of this manifest
- Pricing remains unknown unless reviewed published rates are configured. Approve deliberate spend controls before collection; freezing source does not approve spending.
- **85 backend / 2 fixture browser tests passed**; syntax and diff-whitespace checks passed

## Empty preparation cohort

`data/v2-preparation.sqlite` remains PREPARATION with target 200, zero forecasts, evaluations, resolutions, positions, costs and audit events. Its audit anchor is version 1, count 0, head null. Do not load validation records into this cohort. Legacy JSON checksum remains:

`ac27f22e96a8ace7a0d18e70e22624d859da8c2cb0d6acc2ed6a3ae1089da766`

## Historical genuine live proof, preserved separately

The successful CPI forecast was generated under source fingerprint:

`fa3187513b8554436335938136220bd2f201f2a6b0521e34602cd754c88ecc2c`

It used substantive dated BLS/Federal Reserve research and completed counterevidence scanning. P(YES) was 0.22. The forecast lock at 23:11:30.493Z preceded new status/order-book calls at .501Z/.722Z on 2026-10-05. Unchanged rules naturally created 44 NO paper contracts costing $18.48 including estimated fees. No new generation or market access was performed during this final integrity cleanup.

The original `/tmp/v2-final-live-iMb2jR/validation.sqlite` is unchanged. Ignored `data/v2-validation-audit.sqlite` is a separate, explicitly retroactive sealed copy: 4 original events and 1 import event. Original forecast/evaluation hashes, probabilities, timestamps, cost records, paper position and source fingerprint are unchanged. They remain historical evidence, not a claim of paid generation on the final control fingerprint.

- Original state SHA-256: `b30b9ca32ae5ce6d42f64cb50d55f3a76ca52bfdfad5842c099aa721a31db0db`
- Sealed copy audit count: **5**
- Sealed copy audit head: `e28dd9f8c5e3df2c77672a52009e5bf7496bb20814001279f79c325623b8cd83`

This Git-tracked head anchors that validation snapshot; local database files are deliberately not committed. Retrofitting does not prove historical events were hash-protected when first created. The final code adds only audit integrity to application storage; forecasting/model/research/paper decision modules match the successful live version. Fixtures verify final-code lock-before-quote and corruption/rollback/reopen behavior.

## Non-blocking limitations

Official future settlement is pending; no payout was fabricated. External providers/model implementations can change independently of Git. GDELT/BLS availability remains imperfect and unsupported research paths fail closed. Local hash chaining is tamper-evident and application-append-only, not a signature against privileged full-database replacement. Predictive skill requires the later 200-resolved-forecast experiment, not this pilot or software tests.
