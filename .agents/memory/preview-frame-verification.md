---
name: Preview frame verification
description: Distinguish headless browser private-network transport failures from application framing failures.
---

A synthetic public Replit parent can trigger Chromium's `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS` when embedding the development proxy, even when the app is healthy and its CSP permits the trusted ancestor.

**Why:** A runtime verification encountered this browser transport restriction, not a rejected CSP ancestor.

**How to apply:** Inspect the browser's failure reason before changing application security headers. To isolate CSP/rendering, replay unmodified live app responses using Playwright's route.fetch/fulfill and disclose that transport workaround. Keep normal proxied HTTP checks separate; never interpret replay as verification of the browser's original network path.
