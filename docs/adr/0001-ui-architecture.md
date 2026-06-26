# ADR-0001: UI Architecture Decisions

**Status:** Accepted

---

## 1. No Global Form Element CSS Selectors

### Context

`ballots.css` contained global selectors targeting `input`, `select`, and `textarea` elements directly. These selectors applied default sizing and layout to every form element in the app. When a component needed compact sizing (e.g., the rank selector inside a ballot row), the global `w-full` rule overrode local styles in unpredictable ways due to CSS specificity conflicts. Overriding global selectors required adding specificity hacks or `!important`, making the cascade hard to reason about.

### Decision

Remove all global `input`, `select`, and `textarea` CSS selectors from `ballots.css`. Encapsulate styling in lightweight `<Input>`, `<Select>`, and `<Textarea>` wrapper components that apply styles inline or via scoped class names.

### Consequences

- Component styles are self-contained and predictable; no specificity fights.
- New form elements default to browser styles unless a wrapper component is used — this is intentional and requires discipline to always use the wrappers.
- Adding a new form variant means extending a wrapper component, not touching a global stylesheet.

---

## 2. CSS `field-sizing: content` for Auto-Resizing Textareas

### Context

Textareas that grow to fit their content were implemented with a `useAutosize` JavaScript hook. The hook measured the textarea's `scrollHeight` after each keystroke and set `height` imperatively. This caused a double-paint: the browser laid out the element at its current height, then JavaScript forced a second layout reflow with the corrected height. On low-end devices this produced a visible flicker.

### Decision

Replace `useAutosize` with the CSS property `field-sizing: content`. The browser handles auto-resizing natively with no JavaScript involvement.

Browser support: Chrome 123+, Firefox 116+, Safari 17.4+. These versions cover the target audience.

### Consequences

- No JS hook, no double-paint, no imperative DOM mutation.
- Auto-resizing degrades gracefully in unsupported browsers (textarea stays at its default height) — acceptable given current browser targets.
- If minimum/maximum height constraints are needed, they are expressed with `min-height`/`max-height`, which the browser respects when `field-sizing: content` is active.

---

## 3. Radix UI for Accessible Overlays and Pickers

### Context

Several UI elements — the `SpeakerPointGuide` modal and the `JudgePicker` multi-select — were implemented as hand-rolled components. These implementations lacked:

- Focus trap (Tab key escaped the overlay)
- Escape key dismissal
- `aria-modal` attribute
- `role="dialog"` / `role="listbox"` semantics
- Keyboard navigation within the picker list

This made the components non-compliant with WCAG and difficult for keyboard and screen-reader users.

### Decision

Use `@radix-ui/react-dialog` for `SpeakerPointGuide` and `@radix-ui/react-popover` for `JudgePicker`. Radix UI primitives are unstyled, composable, and implement the WAI-ARIA patterns correctly out of the box.

### Consequences

- Accessibility compliance without maintaining custom focus-management logic.
- Bundle size increases by the Radix UI packages, which are tree-shakeable and small per primitive.
- Styling is fully owned by the app — Radix applies no default visual styles.
- Future overlays and pickers should default to the appropriate Radix primitive rather than hand-rolling.

---

## 4. No Useless `useMemo`

### Context

Several components wrapped simple boolean and primitive derivations in `useMemo`. Examples included `useMemo(() => someArray.length === 0, [someArray])` and `useMemo(() => new Set(ids), [ids])`. The `Set` case is particularly deceptive: the memo function returns a new `Set` on every dependency change, so any component receiving the result still sees a new reference — referential stability is not achieved and the memoization provides no benefit. The hooks added noise and a false sense of optimization.

### Decision

Remove `useMemo` from simple boolean, string, and primitive derivations. Compute them inline. Remove `useMemo` from cases where the result is a new object/array/Set constructed from changing dependencies, because referential stability is lost on every change anyway.

Only add `useMemo` when:
1. The computation is measurably expensive (CPU-intensive loop, large data transformation), AND
2. The downstream re-render cost has been confirmed via React DevTools profiling.

### Consequences

- Less code, easier to read.
- No accidental false optimization that misleads future maintainers.
- Legitimate `useMemo` usage becomes meaningful — if it is there, it was profiled.

---

## 5. Routing Library: Wouter over Chicane or Custom Hook

### Context

The app uses `window.location.hash` for client-side routing (required because it is deployed as a static site on Cloudflare Pages with no server-side rewrites). The original implementation used a custom `useRoute` hook built on `popstate` events. This worked but required ongoing maintenance and had no type safety on route names or parameters.

Three alternatives were evaluated:

**Chicane** — Provides genuine TypeScript type safety via template literal inference with no codegen. `createRouter({ Judge: "/judge/:debateId" })` produces a discriminated union; params are fully typed. Bundle is ~3.5 kB gzip, actively maintained. However, Chicane only supports the History API. Hash routing is not supported and there is no workaround. This is a hard blocker.

**Wouter** — ~1.5 kB gzip. Ships a `useHashLocation` hook that is a drop-in replacement for the current `popstate` logic. Type safety on params is shallow (no template-literal inference), but route names can be narrowed with a hand-written `type Route = "dashboard" | "judge" | "admin" | "profile"` union wrapped around `useLocation`. This covers the real risk (mistyped route names) at minimal cost.

**Custom hook** — Zero bundle cost. No type safety. Requires maintaining `popstate` subscription logic, history push/replace, and any future features (query params, nested routes) from scratch.

### Decision

Adopt **Wouter** with `useHashLocation`. Define a `Route` union type and wrap Wouter's `useLocation` in a thin typed hook to enforce route name correctness.

Do not use Chicane: hash routing is a hard requirement and Chicane does not support it.

### Consequences

- Hash routing requirement is met.
- Route name typos are caught at compile time via the `Route` union type.
- Param types remain unverified at the type level — acceptable given the small number of routes and simple param shapes.
- If route complexity grows (nested layouts, loaders, search params), migration to TanStack Router is straightforward; Wouter's API is a subset.
- Bundle increases by ~1.5 kB gzip compared to the custom hook.
