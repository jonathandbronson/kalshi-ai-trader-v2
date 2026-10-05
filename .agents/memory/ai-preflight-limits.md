---
name: AI preflight limits
description: Distinguish credential/model visibility from successful live generation, and diagnose failures without exposing secrets.
---

Treat authenticated model-catalogue access as credential/model visibility proof only. A completed live forecasting check requires an actual generation through the production quote-free evidence path.

**Why:** Catalogue and model-detail requests returned 200 while generation subsequently failed with a request-format HTTP 400 despite the credential being usable.

**How to apply:** Do not label generation verified from preflight alone. Diagnose with bounded, sanitized status/code/type/parameter fields rather than raw provider messages, which can contain credential fragments. Preserve evidence gates and request budgets while correcting transport issues.
