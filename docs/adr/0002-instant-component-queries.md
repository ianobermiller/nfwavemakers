# ADR-0002: Components Own Their InstantDB Queries

**Status:** Accepted

---

## Context

InstantDB queries are cheap — the client caches and merges overlapping queries automatically, so multiple components querying the same record do not result in redundant network requests. The alternative (hoisting all data fetching to the page and threading props down) forces parent components to know the full data requirements of every descendant, and leads to prop interfaces that grow as children evolve.

## Decision

Components should query the data they need directly via `db.useQuery`, rather than accepting raw data as props threaded down from a parent. The `DebateCard` component, for example, accepts only a `debateId` and fetches its own `date`, `room`, `resolution`, `affTeam`, and `negTeam`.

## Consequences

- Component interfaces stay small and stable — adding a new field to a component doesn't require touching every call site.
- Parent components only need to fetch the minimal data required for their own logic (e.g., a list of IDs for ordering/filtering).
- No prop-drilling of data that only the leaf component uses.
- Components are self-contained and can be moved or reused without auditing ancestor queries.
