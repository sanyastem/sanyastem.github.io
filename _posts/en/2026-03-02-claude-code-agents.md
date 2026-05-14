---
layout: post
title: "Claude Code: Agents — parallel subagents and SDK"
categories: tools
date: 2026-03-02
read_time: 7
difficulty: advanced
series: "Claude Code: complete guide"
part: 3
description: "How Claude Code spawns subagents for parallel tasks, what the Claude Agent SDK is and how to build your own AI workflows."
excerpt_text: "Subagents for parallel tasks, the Claude Agent SDK and how to build your own AI workflows"
keywords: "claude code agents, claude subagents, claude agent sdk, AI agents, claude code parallel tasks"
translation_of: "/tools/claude-code-agents/"
---

## Agents in Claude Code

Claude Code can spawn **subagents** — separate Claude instances that work in parallel on independent tasks. This is useful when work splits into several streams: while one agent writes tests, another fixes the documentation.

## How it works

When you ask Claude to do a big task, it can decide to spawn subagents on its own:

```
You: "Refactor the entire auth module — rewrite in TypeScript,
      add tests and update the README"

Claude: [spawns 3 agents in parallel]
  -> Agent 1: convert .js -> .ts
  -> Agent 2: write tests
  -> Agent 3: update documentation
```

Each subagent gets its own context and tools, works independently, and the results are gathered back.

## Isolation via git worktree

Subagents can work in isolated git worktrees — temporary copies of the repository. The agent makes changes in its branch without disturbing the main work:

```
main worktree: /project          <- main work
worktree 1:    /project-agent-1  <- agent writing tests
worktree 2:    /project-agent-2  <- agent doing refactoring
```

Once done, changes are merged or proposed as a PR.

## Claude Agent SDK

For those who want to build their own AI workflows programmatically, there's the **Claude Agent SDK**. It lets you use Claude Code as an engine inside your own scripts.

### Installation

```bash
# TypeScript / JavaScript
npm install @anthropic-ai/claude-agent-sdk

# Python
pip install claude-agent-sdk
```

> The old package `@anthropic/claude-code` is deprecated. Use `@anthropic-ai/claude-agent-sdk`.

### Simple example (TypeScript)

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = await query({
  prompt: "Find all TODO comments in the project and create a task list",
  options: {
    maxTurns: 10,
    cwd: "/path/to/project",
  },
});

for await (const message of result) {
  console.log(message);
}
```

### Example with custom tools

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = await query({
  prompt: "Analyze performance and suggest improvements",
  options: {
    tools: [
      {
        name: "run_profiler",
        description: "Runs a profiler on the specified file",
        inputSchema: {
          type: "object",
          properties: {
            file: { type: "string" }
          }
        },
        handler: async ({ file }) => {
          // your profiling logic
          return { result: "..." };
        }
      }
    ]
  }
});
```

### Python example

```python
import claude_agent_sdk

async def main():
    async for message in claude_agent_sdk.query(
        prompt="Check tests and fix the failing ones",
        options={"cwd": "/path/to/project", "max_turns": 20}
    ):
        print(message)
```

## Practical scenarios with agents

### Parallel code review

```
You: "Review PR #42: check security,
      performance and code style compliance"

-> Security agent: looks for vulnerabilities, injection, data leaks
-> Performance agent: looks at algorithms, DB queries
-> Code style agent: checks conventions, naming, structure
```

### Codebase migration

```
You: "Migrate the project from React 17 to React 19"

-> Agent 1: updates package.json and dependencies
-> Agent 2: fixes deprecated APIs in components
-> Agent 3: updates tests
-> Agent 4: checks compatibility of third-party libraries
```

## Hooks — event interceptors

Hooks let you run shell commands in response to agent events. Configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint -- --fix"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude Code' 'Task completed'"
          }
        ]
      }
    ]
  }
}
```

Available events:

| Event | When it fires |
|---------|-----------------|
| `SessionStart` | At session start (before the first prompt) |
| `UserPromptSubmit` | When the user submits a prompt |
| `PreToolUse` | Before a tool call |
| `PostToolUse` | After a successful tool call |
| `PostToolUseFailure` | After a tool error |
| `PermissionRequest` | When a permission is requested |
| `Notification` | On agent notification |
| `Stop` | When the agent finishes |
| `SubagentStart` | When a subagent starts |
| `SubagentStop` | When a subagent finishes |
| `PreCompact` | Before context compaction |
| `PostCompact` | After context compaction |

## Limiting agents

So that subagents don't go overboard, configure permissions:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run test)",
      "Bash(npm run lint)",
      "Bash(git diff *)",
      "Bash(git status)"
    ],
    "deny": [
      "Bash(git push *)",
      "Bash(rm *)",
      "WebFetch(*)"
    ]
  }
}
```

## Summary

- Subagents work in parallel on independent parts of a task
- Isolation via git worktree — changes don't disturb the main branch
- Claude Agent SDK — for embedding agents in your own scripts and workflows
- Hooks — for automatic actions on events (linter after editing, notification on completion)
- Always restrict permissions via `permissions` — especially for push and deletes
