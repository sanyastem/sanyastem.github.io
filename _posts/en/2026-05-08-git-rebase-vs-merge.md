---
layout: post
title: "git rebase vs merge: when to use which on a real project"
categories: git
date: 2026-05-08
read_time: 8
difficulty: intermediate
series: "Git workflow: professional practice"
part: 3
description: "When rebase cleans history and when it breaks shared branches: real scenarios, force-with-lease, interactive rebase, reflog recovery."
excerpt_text: "Clean history via rebase or safe merge — the choice depends on the branch. Both scenarios on real cases"
keywords: "git rebase vs merge, interactive rebase, force-with-lease, git reflog, squash commits, clean git history"
translation_of: "/git/git-rebase-vs-merge/"
tldr:
  - "Rule of thumb: your own branch — git rebase main for a linear history; a shared branch — merge only, otherwise a force-push breaks teammates' commits."
  - "After a rebase push with git push --force-with-lease — it refuses to overwrite the branch if someone pushed to it after your last fetch."
  - "Clean up history before a PR with git rebase -i: fixup squashes WIP commits discarding messages, squash merges them keeping messages, drop deletes a commit."
  - "Commits lost after a rebase live in git reflog (keeps HEAD movements for 90 days): git reset --hard <sha> brings everything back."
faq:
  - q: "What to do if teammates cannot pull after my rebase?"
    a: "If you rebased a shared branch and force-pushed, teammates need to: 1) save their local commits (git stash), 2) git fetch + git reset --hard origin/branch, 3) reapply their commits with cherry-pick. Lesson: rebasing shared branches is taboo."
  - q: "Is squash merge in a PR a rebase or a merge?"
    a: "Technically a merge with an automatic squash of all the feature commits into one. GitHub/GitLab do it with a single button. The main history is linear (as with rebase), but without rewriting the feature branch. The best compromise for most teams."
  - q: "Does --force-with-lease protect you 100%?"
    a: "No, but almost. It protects you if someone pushed after your fetch. It does NOT protect you if you just fetched and immediately ran force-with-lease — a colleague could push something in those 2 seconds. In practice it works in 99% of cases."
  - q: "Where can I see commits lost after a rebase?"
    a: "In git reflog — the journal of all HEAD movements for the last 90 days. git reflog show HEAD displays the history, and you can git reset --hard <sha> onto any lost commit. It gets cleared by git gc — which nobody runs by hand anyway."
---

Every team has a holy war: rebase or merge. The truth — each has its own scenarios, and the choice depends not on taste but on **where the branch lives**: yours or shared.

## Short answer — the table

| Situation | Approach | Why |
|---|---|---|
| Pull fresh main into **your** feature branch | `git rebase main` | Linear history, no "merge bubble" |
| Merge a finished feature into main via PR | `merge --no-ff` | Feature boundaries visible in `git log --graph` |
| A feature branch is **shared** by two people | `git merge main` | Rebase will break the other person's commits |
| Prep a PR — lots of small WIP commits | `rebase -i` (squash) | Readable history in main |
| Public branch (release, master) lagging behind a hotfix | `merge` | Never rewrite published history |
| Local branch broke after a rebase | `git reflog` + reset | Reflog keeps everything for 90 days |

Everything else is details. Below we go through each rule with examples.

## What actually happens under the hood

**Merge** creates a new "merge commit" with two parents. History stays as it was + a node on top:

```
*   abc1234 Merge branch 'feature' into main
|\
| * def5678 Add cart endpoint
| * 9876fed Refactor auth
* | 1111aaa Fix typo on main
|/
* 2222bbb Initial
```

**Rebase** "moves" your commits onto a new base — rewrites them with new hashes. History stays linear:

```
* def5678' Add cart endpoint     ← new hash!
* 9876fed' Refactor auth         ← new hash!
* 1111aaa Fix typo on main
* 2222bbb Initial
```

Key word — **rewrites**. The old commits `def5678`, `9876fed` disappear (they're still in reflog for 90 days, but no longer in `log`). If someone branched from them or referenced them in a PR — they now have dangling references.

## Case 1: my feature branch is behind main

The most common case. You've worked on `feature/cart` for a week, 30 commits landed in main meanwhile. You want fresh stuff.

**Option A — `merge` (safe but messy):**

```bash
git checkout feature/cart
git merge main
# resolved conflicts, done
```

History gets a merge node and a diverging graph. After 5 such pulls, history looks like spaghetti.

**Option B — `rebase` (clean, recommended if the branch is yours only):**

```bash
git checkout feature/cart
git fetch origin
git rebase origin/main
# resolved conflicts → git rebase --continue
git push --force-with-lease
```

Your commits "stick" on top of fresh main. History is linear, as if you just started the work.

<div class="warn-block">
<span class="tip-icon">⚠️</span>
<p>After a rebase you need a force-push because commit hashes changed. Use <code>--force-with-lease</code>, not <code>--force</code> — it refuses to push if someone pushed a commit to your branch while you were rebasing.</p>
</div>

## Case 2: more than one person works on the branch

`feature/payments` is shared, you and a colleague commit in parallel. You do:

```bash
git rebase main
git push --force-with-lease
```

What happened on the colleague's side:
- In the morning they had local commits `A`, `B` on `feature/payments`
- You rewrote hashes, force-pushed
- Colleague does `git pull` → conflict "refusing to merge unrelated histories"
- If they do `git pull --rebase`, their commits `A` and `B` get duplicated (now in both your rewritten history and their local one)

Result: either the colleague manually fixes duplicates, or the team spends an hour on "how do we merge this".

**Rule:** on shared branches use only `merge`. Someone may do a final `rebase -i` for squash right before merging to main, but not during development.

## Case 3: prepping a PR with interactive rebase

You have a branch with 12 commits like `wip`, `fix typo`, `oops`, `actually fix it`. Before PR review you want to tidy up.

```bash
git rebase -i origin/main
```

Editor opens:

```
pick a1b2c3d Add cart route
pick e4f5g6h wip
pick h7i8j9k fix typo
pick l1m2n3o Add cart tests
pick p4q5r6s oops
pick t7u8v9w actually fix tests
```

Replace the commands:

```
pick a1b2c3d Add cart route
fixup e4f5g6h wip            # squash into previous, drop message
fixup h7i8j9k fix typo       # same
pick l1m2n3o Add cart tests
fixup p4q5r6s oops
fixup t7u8v9w actually fix tests
```

Save — Git stitches it. You get 2 clean commits: "Add cart route" + "Add cart tests". PR reviewer is happy.

**Key commands:**

| Command | What it does |
|---|---|
| `pick` | Keep the commit as is |
| `reword` | Keep, but change the commit message |
| `squash` | Merge with previous, **combine messages** |
| `fixup` | Merge with previous, **drop the message** |
| `drop` | Delete the commit entirely |
| `edit` | Stop on it — change files and `git commit --amend` |
| Reorder lines | Change commit order |

## Case 4: rebase went wrong, panic mode

You did `git rebase -i`, something went sideways — 3 commits just disappeared. What now?

```bash
git reflog
```

Output:

```
abc1234 (HEAD) HEAD@{0}: rebase finished
def5678 HEAD@{1}: rebase: pick X
9876fed HEAD@{2}: rebase: pick Y
1111aaa HEAD@{3}: checkout: moving from feature to main
2222bbb HEAD@{4}: commit: Add Y
3333ccc HEAD@{5}: commit: Add X     ← there they are, my lost commits
4444ddd HEAD@{6}: commit: Add W
```

Roll back to the moment **before** the rebase:

```bash
git reset --hard 4444ddd
```

Everything's there. Reflog keeps all HEAD movements for 90 days by default — it's nearly impossible to lose anything.

<div class="tip-block">
<span class="tip-icon">💡</span>
<p>Before a complex rebase, make a safety net: <code>git tag backup-$(date +%s)</code>. If the rebase breaks everything — <code>git reset --hard backup-1715200000</code> returns it exactly to the previous state.</p>
</div>

## --force-with-lease vs --force

`--force` — blindly overwrites the remote branch. If someone pushed there before you — their commits vanish.

`--force-with-lease` — only pushes if the remote branch points to the commit you expect (last `fetch`). If someone pushed after your fetch — push refuses. A safe force.

Set a global alias:

```bash
git config --global alias.fpush "push --force-with-lease"
```

Now the habit of `git fpush` instead of `git push -f` saves you from disasters.

## Git Flow vs trunk-based — where rebase conflicts are rarer

In **[Git Flow](/en/git/git-flow/)** (long-lived `develop`/`feature` branches) a feature lives for weeks, lagging behind main by dozens of commits. Rebase every 3 days is normal.

In **trunk-based** (short features, merged into main in 1-2 days) the problem rarely appears: a branch lives 1-2 days, drift is minimal, you can skip rebases.

If the team suffers from constant rebase conflicts — maybe the problem isn't Git but feature branches that live too long. Shorten the cycle — half the pain goes away.

## Summary

- **Someone else's branch → merge only.** Rebase only on your own.
- **`--force-with-lease`**, never `--force`. Set an alias.
- **`rebase -i` before PR** — a powerful tool: squash WIP commits, fixup typos, reorder.
- **`git reflog` saves you almost always** — 90 days of HEAD movement history.
- **If conflicts are constant** — branches live too long, not Git's fault. Branch organization basics are in [Git flow](/en/git/git-flow/), and what should never end up in commits is in the [.gitignore guide](/en/git/gitignore/).
