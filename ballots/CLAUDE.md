**IMPORTANT**: before you do anything else, run the `beans prime` command and heed its output.

## Issue tracker

Issues live in Beans (flat-file markdown in `.beans/`). See `docs/agents/issue-tracker.md`.

When making a commit, include the relevant bean IDs in the commit message.

## Backend

This app uses PocketBase at `pb.obermillers.com`. Keep authorization in
PocketBase collection API rules, use the official JavaScript SDK, and use batch
requests for multi-record writes that must be atomic. The instance is shared:
prefix every app-owned collection with `ballots_` and do not add app-specific
fields or rules to the shared `users` auth collection.
