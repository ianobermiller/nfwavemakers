---
name: land-bean
description: >-
  Land a finished nfwavemakers bean on main and remove its git workspace.
  Use when the user says merge, land, ship, clean up, or "merge and cleanup"
  for a bean, including after they verify a dispatched bean.
---

# Land a bean

From the main checkout on `main`, one command squash-merges the bean, verifies the build, commits, and removes the workspace and branch:

```bash
npm run worktree:merge -- <bean-id>
```

Do that when the user asks to merge or land a bean. Cleanup is part of the command. Do not run `worktree:done` afterward, and do not ask them to say "cleanup".

Never `git merge` or `git commit` the land yourself. If they name several beans, run the command once per bean.

## When it stops

Conflicts, or a failed `npm run build` or `npm run check`, leave the merge staged and the workspace in place.

- Fix the staged tree, then `npm run worktree:merge -- <bean-id> --commit-only`. That commits and then removes the workspace.
- Abandon the staged merge with `git reset --hard HEAD` in the main checkout. The workspace stays until it is torn down.

## Abandoning without landing

`npm run worktree:done -- <bean-id>` removes a workspace whose branch is already on main. Unmerged work needs `--force`, which discards it. Use that only when the user is not landing the bean. If a land committed but cleanup refused (dirty workspace, or a conflict resolution the branch check does not recognize), retry `worktree:done`, and use `--force` only to discard what is left.
