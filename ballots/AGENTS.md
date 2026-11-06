**IMPORTANT**: before you do anything else, run the `beans prime` command and heed its output.

## Issue tracker

Issues live in Beans (flat-file markdown in `.beans/`). See `docs/agents/issue-tracker.md`.

When making a commit, include the relevant bean IDs in the commit message.

## App layout

Ballot screens, hooks, and data live in this directory. The club site and the Vite app are at the repo root, so run `npm run dev`, `npm run check`, and `npm run build` from there. PocketBase migrations and hooks stay here.

## Backend

This app owns PocketBase at `pb.nfwavemakers.com` (binary and deploy live in
`pocketbase/` at the repo root; hooks and migrations stay in
`ballots/pocketbase/`). Production may still point at the older shared
`pb.obermillers.com` until the data cutover finishes — see
`pocketbase/README.md`. Keep authorization in collection API rules, use the
official JavaScript SDK, and use batch requests for multi-record writes that
must be atomic. App-owned collections keep the `ballots_` prefix.
