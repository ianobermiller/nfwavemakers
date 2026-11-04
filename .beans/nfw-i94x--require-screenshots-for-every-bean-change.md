---
# nfw-i94x
title: Require screenshots for every bean change
status: completed
type: task
priority: normal
created_at: 2026-11-04T15:09:01Z
updated_at: 2026-11-04T15:15:17Z
---

Agents can finish a bean with a written description. Every change has to be proven with screenshots first. The user then checks by running the app locally.

- [x] Require screenshots for every change in the dispatch skill
- [x] Keep the standing verify step aligned with that requirement

## Summary of Changes

The dispatch skill now requires screenshots for every change. A subagent report without them is incomplete, and the orchestrator has to show the images before asking you to check. AGENTS.md says the same for bean work that is not dispatched. You verify by running the app locally after the screenshots are in the chat.
