---
# nfw-afga
title: Collect name and category before approval
status: todo
type: bug
priority: high
created_at: 2026-11-07T12:12:17Z
updated_at: 2026-11-07T12:12:17Z
---

The first real sign-up landed in Manage Users as Unnamed, with no category, and the approver cannot fix either field without a modal.

Oaklee (ladson.oaklee@gmail.com) was never asked for her full name. Lessons skip the profile screen that ballots use, and an account is created as soon as the email code is requested, so a sign-up can sit in Pending with no name. Students are also not required to pick Speech, Team Policy, or Lincoln-Douglas before they show up for approval.

On the Pending row:

- "awaiting Approval" mixes capitalization and repeats the Pending filter.
- "No category" is a dead label. The approver should set category with a dropdown, the same way they set Student.
- Approval opens a modal that asks for role and category again. Approve should be one click after those dropdowns are set.
- There is no way to type or correct the name.

## Tasks

- [ ] Ask for full name, role, and student category on every sign-up path, including lessons
- [ ] Let an approver edit the name on the user row
- [ ] Remove the "awaiting Approval" badge
- [ ] Replace the "No category" badge and the approval modal with a category dropdown and a one-click Approve
- [ ] Verify the pending row and the sign-up profile screen in the browser
