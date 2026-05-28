---
layout: post
title: "Claude Code: Skills — your own commands for the agent"
categories: ai
date: 2026-03-02
last_modified_at: 2026-05-24
read_time: 5
difficulty: intermediate
series: "Claude Code: complete guide"
part: 2
description: "What Skills are in Claude Code, how to write your own command scripts and invoke them via /command right inside a session."
excerpt_text: "Skills are your own /commands for Claude Code. Write once, invoke in any session"
keywords: "claude code skills, slash commands claude, custom commands claude code, .claude/commands"
translation_of: "/ai/claude-code-skills/"
---

## What are Skills

Skills are Markdown files with instructions for the agent. Write once, reuse in any session. Instead of explaining "do a code review by our standards" every time — you write a skill once and type `/review`.

## Skills and slash commands — now one thing

In 2026 Anthropic merged the old custom commands into Skills — it's now **one system**, and Skills became the primary, fuller-featured format:

- **Slash commands** (old format `.claude/commands/*.md`) — you invoke manually via `/name`, kept for backward compatibility
- **Agent Skills** (primary format `.claude/skills/<name>/SKILL.md`) — the same `/name`, plus Claude can invoke them **itself** by `description`; they support frontmatter and helper files alongside

Files in both folders create a `/command`. The difference is **who invokes**:

| | Who triggers | When to use |
|---|---|---|
| **User-invoked** | You manually `/deploy` | Side-effect actions you control |
| **Agent-invoked** | Claude itself by `description` | Capabilities the model applies automatically (formatting, checks) |

A single `SKILL.md` gives you **both**: an auto-trigger by description and a manual `/command`. Control behavior via frontmatter (`user-invocable`, `disable-model-invocation`).

## Where Skills are stored

The recommended format — a folder with `SKILL.md`:

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

The old format `.claude/commands/*.md` still works (backward compatibility), but new skills are better placed in `.claude/skills/` — it supports frontmatter, helper files alongside, and agent auto-invocation.

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
| `effort` | `low` / `medium` / `high` — depth of work (more = more tokens) |
| `context: fork` | Run in a subagent (isolation) |
| `user-invocable: false` | Only Claude can invoke, not the user |
| `disable-model-invocation: true` | Manual `/name` only — Claude won't auto-invoke it |

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
| `/code-review` | Review changes for bugs and quality |
| `/security-review` | Find vulnerabilities in the changes |
| `/verify` | Run the app and confirm a change works |
| `/run` | Launch the project's app |

## Plugins and marketplaces

To avoid copying `.claude/skills/` by hand between projects and teams, skills (along with commands, agents, hooks and MCP servers) are distributed as **plugins** from marketplaces:

```bash
# Add a marketplace
/plugin marketplace add owner/repo

# Install a plugin (with its skills/commands)
/plugin install plugin-name@marketplace
```

The official marketplace (`claude-plugins-official`) is available out of the box. Skills from a plugin are invoked with a prefix: `/plugin-name:skill-name`.

## Summary

- Primary format: `.claude/skills/<name>/SKILL.md` with frontmatter; `.claude/commands/*.md` for backward compatibility
- `$ARGUMENTS` — for passing parameters
- `allowed-tools` in frontmatter — restricts what the agent can do
- `effort: high` — for complex tasks that need deep analysis
- Share skills across projects — via plugins (`/plugin install`)
