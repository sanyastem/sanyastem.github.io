---
layout: default
lang: en
title: "Git: cheat sheet"
permalink: /en/cheats/git/
description: "Daily commands, branches, undoing changes, rebase, stash, reflog and aliases — git on one page. Bookmark-ready."
keywords: "git cheat sheet, git commands, git rebase, git reset, git stash, reflog"
og_image: /assets/og-git.png
translation_of: /cheats/git/
---

<article class="article-body" markdown="1" style="max-width:820px; margin:calc(var(--nav-height) + 56px) auto 100px; padding:0 24px;">

# Git: cheat sheet

The commands that cover 95% of daily work. Bookmark it. Deep dives: [Git flow](/en/git/git-flow/), [rebase vs merge](/en/git/git-rebase-vs-merge/) and [.gitignore](/en/git/gitignore/).

## Setup (once)

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
git config --global pull.rebase true          # pull via rebase, no junk merge commits
git config --global core.excludesfile ~/.gitignore_global
```

## Daily

| Command | What it does |
|---|---|
| `git status -sb` | Short status + branch |
| `git add -p` | Stage changes hunk by hunk |
| `git commit -m "msg"` | Commit |
| `git commit --amend --no-edit` | Append to the last commit |
| `git pull origin main` | Pull changes |
| `git push -u origin <branch>` | Push and track the branch |
| `git fetch --all --prune` | Refresh refs, drop dead ones |

## Branches

```bash
git switch -c feature/login     # create and switch
git switch -                    # jump back to the previous branch
git branch -d feature/login     # delete a merged branch
git push origin --delete feature/login   # delete on the server
git branch --sort=-committerdate # branches by freshness
```

## Undoing changes

| Situation | Command |
|---|---|
| Discard uncommitted edits in a file | `git restore <file>` |
| Unstage a file (after `add`) | `git restore --staged <file>` |
| Undo last commit, keep the changes | `git reset --soft HEAD~1` |
| Undo commit and changes (irreversible!) | `git reset --hard HEAD~1` |
| Revert a commit with a new commit (shared branches) | `git revert <sha>` |
| Stop tracking a file but keep it on disk | `git rm --cached <file>` |

## Rebase

```bash
git rebase main                  # replay your branch onto fresh main
git rebase -i HEAD~5             # interactive: squash / fixup / reword / drop
git rebase --abort               # changed your mind
git push --force-with-lease      # safe force push (never plain --force)
```

> Rule: rebase your own branches only. Shared ones — merge. Details: [rebase vs merge](/en/git/git-rebase-vs-merge/).

## Stash

```bash
git stash push -m "wip: login form"
git stash list
git stash pop                    # apply and drop
git stash apply stash@{1}        # apply a specific one, keep it
git stash push -p                # stash selectively
```

## History and search

```bash
git log --oneline --graph -15
git log -p <file>                # file history with diffs
git log -S "function"            # commits where a string appeared/vanished
git blame -L 10,20 <file>        # who touched lines 10–20
git diff main...feature          # what the branch adds
git show <sha>:<path>            # a file from any commit
```

## Rescue — reflog

```bash
git reflog                       # every HEAD move for 90 days
git reset --hard HEAD@{2}        # go back to the pre-disaster state
git checkout -b rescue <sha>     # recover a "lost" commit into a branch
```

## Aliases

```bash
git config --global alias.st "status -sb"
git config --global alias.lg "log --oneline --graph -15"
git config --global alias.amend "commit --amend --no-edit"
git config --global alias.undo "reset --soft HEAD~1"
```

## .gitignore in 10 seconds

```gitignore
node_modules/
.env
.env.*.local
dist/
build/
*.log
.DS_Store
.idea/
```

Already committed something you shouldn't have? `git rm -r --cached <path>` + commit. Secrets — rotate them. Details: [.gitignore](/en/git/gitignore/).

</article>
