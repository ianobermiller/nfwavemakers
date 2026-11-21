---
name: land-bean
description: >-
  Land a finished nfwavemakers bean on main and remove its git workspace.
  Use when the user says merge, land, ship, clean up, or "merge and cleanup"
  for a bean, including after they verify a dispatched bean.
---

# Land a bean

From the main checkout on `main`, run:

```bash
npm run worktree:merge -- <bean-id>
```

The command rebases the workspace onto current main, runs build and check in the workspace, then fast-forwards main with `--ff-only`. It preserves branch commits and removes the workspace and branch after landing.

Use this command when the user asks to merge or land. Never merge or commit the land manually. If they name several beans, run the command once per bean and wait for each to finish. Cleanup is part of the command.

After a requested land succeeds, archive the current Codex chat with the app archive tool. Keep it open if landing fails.

## When it stops

Rebase conflicts leave main untouched. Resolve them in `.agents/worktrees/<bean-id>`, run `git rebase --continue` there, then retry the landing command. To abort the rebase, run `git rebase --abort` in the workspace.

Failed checks leave main untouched. Fix and commit changes in the workspace, then retry the same landing command.

If main advances during verification, retry so the workspace rebases and verifies against the new tip. A fast-forward refusal leaves the workspace available. There is no staged merge or `--commit-only` recovery.

## Abandoning without landing

`npm run worktree:done -- <bean-id>` removes a workspace whose branch is already on main. Unmerged work needs `--force`, which discards it. Use that only when the user is not landing the bean. If a land committed but cleanup refused (dirty workspace, or a conflict resolution the branch check does not recognize), retry `worktree:done`, and use `--force` only to discard what is left.
