---
# nfw-fs3x
title: Split route code so public pages defer ballot and admin screens
status: completed
type: task
priority: normal
created_at: 2026-11-22T01:16:25Z
updated_at: 2026-11-22T01:28:30Z
---

Lazy-load route screens with existing Suspense, skeletons and error boundaries. Public entry must defer ballot/admin/editor screen chunks. Preserve auth and membership gates, navigation, titles, cold/warm deep links and nonblank transitions. Inspect built output and exercise public/member/admin/lesson routes. Avoid unrelated router rewrite.

- [x] Implement scoped improvement.
- [x] Prove behavior and request/query shape.
- [x] Pass npm run build and npm run check from workspace root.
- [x] Capture dark-mode screenshots of affected states.
- [x] Complete bean with Summary of Changes and commit with bean ID.

## Summary of Changes

App routes use React.lazy for auth, dashboard, ballot, admin, lesson and secondary public screens. Home and shared auth/layout remain immediately available. The existing route Suspense preserves prior screens during transitions and displays skeletons for cold routes. Import failures are tagged separately from data failures; Try again reloads the current document for failed imports to reset React.lazy/browser module caches and obtain the current deployment assets, while data errors keep their existing in-place retry.

Build now emits a Vite manifest. New route browser tests inspect the actual production dependency graph and network requests to establish that public entry does not eagerly fetch member/editor/lesson screens, then prove cold skeletons, retained-page transitions, warm import reuse, protected-route gating, page titles, and recovery after a deliberately failed JS chunk. PLAYWRIGHT_PREVIEW=1 runs the suite against a production build configured for the isolated test backend.

Validation: npm run build, npm run check, 74 unit tests, full production-browser suite (61 passed, 5 existing project-specific skips), and 12 route-loading checks in normal Vite dev mode all pass. Dark screenshots visually inspected. A preliminary test run incorrectly expected a custom lesson-editor title the existing editor never set; corrected that test to assert its actual heading, keeping title behavior unchanged.

Inherited lesson dependency: 112e812f27f9b3549bb6fcc1fa4fc7b911645e5e (cherry-picked before this bean). No API/schema changes. Review screenshots: /private/tmp/nfw-fs3x-{public,cold-loading,transition,about,import-error,admin,lesson,member}-{chromium,mobile}.png. Test servers stop on completion. Review /, /about, /ballots, /admin-users and /lessons/2026/1.
