---
layout: post
title: "Claude Code: Skills — your own commands for the agent"
categories: tools
date: 2026-03-02
read_time: 5
difficulty: intermediate
series: "Claude Code: complete guide"
part: 2
description: "What Skills are in Claude Code, how to write your own command scripts and invoke them via /command right inside a session."
excerpt_text: "Skills are your own /commands for Claude Code. Write once, invoke in any session"
keywords: "claude code skills, slash commands claude, custom commands claude code, .claude/commands"
translation_of: "/tools/claude-code-skills/"
---

## What are Skills

Skills are custom commands for Claude Code, invoked via `/name` right in a session. Essentially, they are Markdown files with instructions: what to do when the user calls the command.

Instead of explaining "do a code review by our standards" to the agent every time, you write a skill once and then just type `/review`.

## Where Skills are stored

The new recommended format — a folder with `SKILL.md`:

```
.claude/
└── skills/
    ├── review/
    │   └── SKILL.md     # /review
    ├── commit/
    │   └── SKILL.md     # /commit
    └── deploy-check/
        └── SKILL.md     # /deploy-check
```

The old format `.claude/commands/*.md` still works, but the new one supports frontmatter with settings.

Global skills (for all projects):

```
~/.claude/
└── skills/
    └── standup/
        └── SKILL.md     # /standup — everywhere
```

## File structure — SKILL.md with frontmatter

```markdown
---
name: review
description: Code review of changes against project standards
allowed-tools: Read, Bash
argument-hint: "[file path or empty for all changes]"
effort: medium
---

Do a code review of all changed files.
Check for: any bugs, compliance with our conventions from CLAUDE.md,
any obvious performance issues.
Format the result as a list of remarks with file and line.
```

Save as `.claude/skills/review/SKILL.md` — and the `/review` command is now available in the session.

**Key frontmatter fields:**

| Field | What it does |
|------|-----------|
| `description` | Description (up to 1024 chars) — Claude understands when to use it |
| `allowed-tools` | Restrict tools (Read, Edit, Write, Bash...) |
| `argument-hint` | Hint about the arguments accepted |
| `effort` | `low` / `medium` / `high` / `max` — depth of work |
| `context: fork` | Run in a subagent (isolation) |
| `user-invocable: false` | Only Claude can invoke, not the user |

## Example: skill for commits

```markdown
# Commit

Create a git commit for all staged changes.

1. Run `git diff --staged` to see what's changing
2. Come up with a Conventional Commits message:
   - feat: new feature
   - fix: bug fix
   - refactor: refactoring without behavior change
   - docs: documentation only
3. Run `git commit -m "message"`
4. Show the resulting commit via `git log -1`
```

## Example: skill for pre-deploy check

```markdown
# Deploy check

Before deploying, check:

1. `npm run lint` — no linter errors
2. `npm run test` — all tests green
3. `npm run build` — build passes
4. No uncommitted changes (`git status`)

If something failed — stop and report what exactly.
If everything is fine — write "Ready to deploy"
```

## Arguments in Skills

Skills can accept arguments via `$ARGUMENTS`:

```markdown
# Fix issue

Look at GitHub Issue #$ARGUMENTS.
Find related code in the repository and propose a fix.
```

Invocation: `/fix-issue 142`

## Example: skill for daily standup

```markdown
# Standup

Help me write a message for the daily standup.

1. Run `git log --since="yesterday" --oneline --author="$(git config user.name)"`
2. Based on the commits, draft the text:
   - **Yesterday:** what I did (from commits)
   - **Today:** what I plan (ask me)
   - **Blockers:** anything in the way


Format — short bullets, no fluff.
```

## Built-in Skills

Claude Code ships with built-in commands and bundled skills:

| Command | What it does |
|---------|-----------|
| `/help` | List of all commands |
| `/clear` | Reset session context |
| `/compact` | Compress conversation history |
| `/memory` | Manage CLAUDE.md memory files |
| `/doctor` | Installation diagnostics |
| `/rewind` | Roll back to a previous checkpoint |
| `/batch` | Parallel changes across a large codebase |
| `/loop` | Repeat a task on a schedule (`/loop 5m /check`) |
| `/simplify` | Review changes for quality and efficiency |

## Summary

- New format: `.claude/skills/<name>/SKILL.md` with frontmatter
- Old format `.claude/commands/*.md` — still works
- `$ARGUMENTS` — for passing parameters
- `allowed-tools` in frontmatter — restricts what the agent can do
- `effort: high` — for complex tasks that need deep analysis
