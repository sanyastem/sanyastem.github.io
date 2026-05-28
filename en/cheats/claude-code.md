---
layout: default
lang: en
title: "Claude Code: cheat sheet"
permalink: /en/cheats/claude-code/
description: "All commands, flags, files, slash commands, SKILL.md frontmatter, MCP setup, hooks events — one page. Ready to bookmark."
keywords: "claude code, cheat sheet, slash commands, SKILL.md, MCP, hooks, .claude/settings.json"
og_image: /assets/og-ai.png
translation_of: /cheats/claude-code/
---

<article class="article-body" markdown="1" style="max-width:820px; margin:calc(var(--nav-height) + 56px) auto 100px; padding:0 24px;">

# Claude Code: cheat sheet

All commands, flags, files and configs on a single page. Bookmark it.

## Install

```bash
# macOS / Linux / WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# macOS — Homebrew
brew install --cask claude-code

# Windows — WinGet
winget install Anthropic.ClaudeCode
```

> The old `npm install -g @anthropic/claude-code` is deprecated.

## CLI flags

| Command | What it does |
|---|---|
| `claude` | Interactive session |
| `claude -p "..."` | One-shot query → exit |
| `claude --continue` | Resume the last session |
| `claude --resume` | Pick a session from history |
| `claude --bare -p "..."` | Minimal mode: no hooks/skills/MCP/CLAUDE.md — for scripts |
| `claude --dangerously-skip-permissions` | Auto-mode without confirmations (use carefully) |
| `claude --version` | Version |
| `claude --help` | Full flag list |

## Slash commands (in-session)

| Command | What it does |
|---|---|
| `/help` | All commands |
| `/clear` | Reset context |
| `/compact` | Compress history |
| `/memory` | Manage CLAUDE.md |
| `/recap` | Session summary |
| `/rewind` | Roll back to a checkpoint |
| `/init` | Generate CLAUDE.md |
| `/agents` | Manage subagents |
| `/mcp` | Connected MCP servers |
| `/plugin` | Plugin install and marketplaces |
| `/usage` | Token usage stats |
| `/doctor` | Installation diagnostics |

## Bundled skills

| Skill | What it does |
|---|---|
| `/code-review` | Review changes for bugs and quality |
| `/security-review` | Find vulnerabilities |
| `/verify` | Run the app and confirm a change works |
| `/run` | Launch the project's app |
| `/debug` | Debug alongside the agent |
| `/loop` | Repeat a task on a schedule (`/loop 5m /check`) |
| `/batch` | Parallel changes across a large codebase |
| `/claude-api` | Help with Claude/Anthropic API |

## Hotkeys

| Combo | Action |
|---|---|
| `Ctrl+C` | Interrupt operation |
| `Ctrl+D` | Exit |
| `Esc` | Interrupt the model's response |

## Files and folders

```text
project/
├── CLAUDE.md                       # project context (stack, commands, rules)
├── .claude/
│   ├── settings.json               # permissions, hooks (project-scoped)
│   ├── settings.local.json         # personal settings (gitignored)
│   ├── skills/<name>/SKILL.md      # your own /commands
│   ├── commands/<name>.md          # old skill format (backward compat)
│   └── agents/<name>.md            # your own subagents
├── .mcp.json                       # MCP servers (project scope)
└── .env                            # MCP secrets (gitignored)

~/.claude/
├── settings.json                   # global settings
├── skills/<name>/SKILL.md          # global skills
├── agents/<name>.md                # global subagents
└── .claude.json                    # MCP local/user scope
```

## CLAUDE.md — minimum

```markdown
# Project

One-liner description.

## Stack
- Next.js 15, TypeScript, Prisma, Tailwind

## Commands
- `npm run dev` — dev server
- `npm run test` — tests
- `npm run lint` — linter

## Rules
- No `any` in TS
- Conventional Commits
- Don't touch `src/generated/`
```

## .claude/settings.json — permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git diff *)",
      "Bash(git status)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push *)",
      "WebFetch(*)"
    ]
  }
}
```

**Rule shape:** `Tool(specifier)` — `Bash(npm run *)`, `Read(./.env)`, `Edit(./src/**)`, `WebFetch(domain:example.com)`, `Skill(my-skill)`. `deny` wins over `allow`.

## SKILL.md — frontmatter

```yaml
---
name: review
description: Code review of changes against project standards   # ≤1024 chars, model decides
allowed-tools: Read, Bash                                       # restrict tools
argument-hint: "[path or empty]"                                 # hint for $ARGUMENTS
effort: medium                                                   # low / medium / high / xhigh / max
context: fork                                                    # run in a subagent
user-invocable: true                                             # available via /name
disable-model-invocation: false                                  # model auto-invocation allowed
model: opus                                                      # model for this skill
agent: Explore                                                   # subagent type (if context: fork)
paths: ["src/**/*.ts"]                                           # activate by paths
shell: bash                                                      # bash / powershell
when_to_use: "when editing TS files"                              # hint for the model
hooks: { ... }                                                   # skill-local hooks
---

Body — instructions for the agent in plain Markdown.
$ARGUMENTS — substituted from /name <args>
```

## Subagent — `.claude/agents/<name>.md`

```yaml
---
name: security-reviewer
description: Audit for vulnerabilities — injection, leaks, unsafe deps
model: opus
tools: Read, Grep, Bash
---

Review the changes for vulnerabilities. Return findings with file and line.
```

Invoke manually via `/agents` or let Claude auto-delegate by `description`.

## MCP — `claude mcp add`

```bash
# Local (stdio) — options come BEFORE the name, the command is separated by `--`
claude mcp add --transport stdio <name> -- npx -y <package> [args]

# Remote (HTTP)
claude mcp add --transport http <name> <url>

# Scope: local (default), project (→ .mcp.json), user (shared)
claude mcp add --scope project --transport stdio postgres -- npx -y @modelcontextprotocol/server-postgres

# HTTP auth
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer ${GITHUB_TOKEN}"
```

```bash
claude mcp list             # all servers
claude mcp get <name>       # details
claude mcp remove <name>    # remove
claude mcp logs <name>      # logs (if something's broken)
```

In session: `/mcp` — list of available tools.

## .mcp.json — example

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": { "Authorization": "Bearer ${GITHUB_TOKEN}" }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": { "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}" }
    }
  }
}
```

## Hooks — events

In `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{ "type": "command", "command": "npm run lint -- --fix" }]
    }]
  }
}
```

| Event | When it fires |
|---|---|
| `SessionStart` | Session start |
| `UserPromptSubmit` | User submits a prompt |
| `PreToolUse` | Before a tool call |
| `PostToolUse` | After a successful tool call |
| `PostToolUseFailure` | After a tool error |
| `PermissionRequest` | Permission request |
| `Notification` | Notification |
| `Stop` | Agent finished |
| `SubagentStart` / `SubagentStop` | Subagent lifecycle |
| `PreCompact` / `PostCompact` | Before/after context compaction |

## Plugins and marketplaces

```bash
# Add a marketplace
/plugin marketplace add owner/repo

# Install a plugin
/plugin install <name>@<marketplace>
```

Skills from a plugin are invoked with a prefix: `/plugin-name:skill-name`. The official marketplace `claude-plugins-official` is available out of the box.

## SDK for your own workflows

```bash
# TypeScript / JS
npm install @anthropic-ai/claude-agent-sdk

# Python
pip install claude-agent-sdk
```

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = await query({
  prompt: "Find all TODOs",
  options: { maxTurns: 10, cwd: "/path/to/project" },
});
for await (const m of result) console.log(m);
```

## Deeper dives

- [Install and basic setup](/en/ai/claude-code-setup/)
- [Skills — your own /commands](/en/ai/claude-code-skills/)
- [Agents and SDK](/en/ai/claude-code-agents/)
- [MCP — external tools](/en/ai/claude-code-mcp/)
- [Build your own MCP server](/en/ai/claude-code-mcp-build/)

</article>
