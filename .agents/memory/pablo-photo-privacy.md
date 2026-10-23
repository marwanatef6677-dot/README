---
name: Pablo profile photo privacy
description: User photo requirements and visibility rules for customer avatars and captain vehicle photos.
---

Customers may add an optional profile photo. Captains must upload a photo showing themselves with their car or motorcycle before their account can be reviewed and accept rides. All signed-in Pablo users may view account photos; unauthenticated visitors may not. The owner reviews captain vehicle photos, and replacing one requires review again.

**Why:** The user asked for customers to register with a name and photo, captains to be photographed with their vehicle for credibility, and then explicitly chose visibility to all signed-in Pablo users rather than the public internet.

**How to apply:** Keep image bytes in private storage and require an authenticated Pablo session for every image endpoint. Do not make photo URLs publicly accessible. Preserve owner review and the requirement to re-review replaced captain photos.
