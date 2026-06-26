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

## CSS and form element rules
- Do NOT add global CSS selectors for `input`, `select`, or `textarea`. Use the `<Input>`, `<Select>`, and `<Textarea>` wrapper components instead.
- Use CSS `field-sizing: content` for auto-resizing textareas. Do NOT use JS hooks that measure scrollHeight imperatively.

## Accessible overlays and pickers
- Use `@radix-ui/react-dialog` for modals/dialogs. Do NOT hand-roll focus-trap or Escape-key logic.
- Use `@radix-ui/react-popover` for floating pickers (e.g., multi-select). Do NOT hand-roll keyboard navigation for picker lists.

## Routing
- Use Wouter with `useHashLocation` for client-side routing. Do NOT use Chicane (no hash routing support).
- Define a `Route` union type and wrap Wouter's `useLocation` in a typed hook to enforce route name correctness at compile time.
