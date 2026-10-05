---
name: Historical audit trust boundary
description: Preserve pre-hardening live records without presenting retroactive audit sealing as a new live forecast.
---

Historical live forecast metadata must retain its original source fingerprint and record hashes. Retrofitting an unsealed audit is a separate, explicitly labeled validation copy, not a new forecast or permission to populate benchmark storage.

**Why:** Audit-only hardening changes the source fingerprint after a genuine pilot; rewriting historical metadata would falsely attribute that generation to code that did not produce it.

**How to apply:** Keep the original ledger intact, label retroactive trust boundaries, retain a verified snapshot anchor, and validate unchanged decision-path code plus current regression tests. Never pool pilot records into an empty benchmark cohort.
