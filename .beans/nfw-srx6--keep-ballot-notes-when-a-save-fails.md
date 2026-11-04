---
# nfw-srx6
title: Keep ballot notes when a save fails
status: todo
type: bug
priority: high
created_at: 2026-11-04T14:52:02Z
updated_at: 2026-11-04T14:52:02Z
---

A judge's speaker notes disappeared from a live ballot. The autosave requests were rejected (the session was no longer accepted), the form never said so, and a reload kept only what the server had already stored.

Written feedback has to survive a failed save, a refresh, and a closed tab. The copy on this device is the source of truth until the server confirms it.

- [ ] Save the draft on this device on every change
- [ ] Restore that draft when it has notes the server does not
- [ ] Retry failed saves, and never replace stored notes with an empty payload
- [ ] Show when feedback is only on this device
- [ ] Cover restore, retry, and the empty-notes guard with tests
