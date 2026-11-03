---
# nfw-00x6
title: Let people dismiss the November 10 club note
status: todo
type: task
priority: high
created_at: 2026-11-03T23:17:24Z
updated_at: 2026-11-03T23:17:24Z
---

The November 10 cancellation note needs a close control. Closing it should stick in localStorage under a key for that date, so it stays hidden on later visits and does not collide with a notice for another day.

- [ ] Add a close control on the note
- [ ] Remember the dismissal in localStorage under a November 10 key
- [ ] Verify closing it hides the note after a reload
