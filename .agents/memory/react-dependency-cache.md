---
name: React dependency cache
description: Avoid false version mismatch errors after upgrading React packages
---

After upgrading React and React DOM together, invalidate the affected frontend's Vite optimized-dependency cache before restarting.

**Why:** A normal workflow restart reused an old React DOM bundle even though package resolution showed matching React and React DOM versions.

**How to apply:** If the browser reports a mismatch that the installed package versions do not show, clear only generated Vite cache directories, then restart the affected frontend. Do not change correct dependency versions to match a stale bundle.
