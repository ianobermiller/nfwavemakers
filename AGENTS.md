## Agent skills

### Issue tracker

Issues live in GitHub Issues for ianobermiller/nfwavemakers. See `docs/agents/issue-tracker.md`.

### Triage labels

Using default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — one CONTEXT.md + docs/adr/ at the repo root. See `docs/agents/domain.md`.

## React useMemo rules
- Do NOT wrap simple boolean, string, or primitive derivations in useMemo. Compute them inline.
- Do NOT use useMemo when the result is a new object/array/Set built from constant values - referential stability is lost on every dep change anyway.
- Only use useMemo when the computation is genuinely expensive AND you have confirmed downstream re-render cost via React DevTools profiling.
