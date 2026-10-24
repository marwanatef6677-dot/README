---
name: Pablo install prompt
description: User-facing install prompt behavior for Android and iPhone.
---

Show the install invitation on every browser visit from Android or iPhone until Pablo is installed; hide it when launched in standalone mode. On Android, call the native install prompt when the browser provides it and otherwise show browser-menu instructions. On iPhone, explain that installation is done through Safari’s Share menu and “Add to Home Screen,” not a programmatic install dialog.

**Why:** The owner clarified that the invitation should not be limited to first-time visitors and must support both Android and iPhone.

**How to apply:** Keep the prompt repeatable after dismissal on the next visit, mobile-only, and suppressed for installed standalone launches.
