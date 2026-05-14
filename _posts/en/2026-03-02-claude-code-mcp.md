---
layout: post
title: "Claude Code: MCP — connecting external tools"
categories: tools
date: 2026-03-02
read_time: 8
difficulty: intermediate
series: "Claude Code: complete guide"
part: 4
description: "What MCP (Model Context Protocol) is, how to connect servers to Claude Code, and which MCPs are useful for development."
excerpt_text: "MCP extends Claude Code's capabilities: databases, GitHub, browser, filesystem and more"
keywords: "MCP claude code, model context protocol, mcp server, claude code extensions, mcp development"
translation_of: "/tools/claude-code-mcp/"
faq:
  - q: "MCP vs Skills — what's the difference?"
    a: "Skills are Markdown prompts + (optionally) a script, executed by Claude Code itself. MCP is an external process over JSON-RPC that gives Claude additional tools/resources. Skills are simpler for helper commands; MCP is for integrating with external systems (DB, API, browser)."
  - q: "Can I connect MCP servers published by third parties?"
    a: "Technically yes, but be careful. An MCP server runs with your privileges and sees everything you pass to it (including code). Connect only servers from the official registry or from trusted authors. Always read the permissions a server requires."
  - q: "Where do I put MCP server secrets — in .mcp.json?"
    a: "Never hardcode tokens directly in .mcp.json — that file is committed. Use substitution via environment variables: \"env\": { \"GITHUB_TOKEN\": \"${GITHUB_TOKEN}\" }, and keep the actual token in .env (gitignored) or in system variables."
  - q: "How do I check that an MCP server actually connected?"
    a: "Inside a session — the /mcp command shows the list of connected servers and their tools. From the terminal — claude mcp list (status) and claude mcp logs <name> (if something isn't working)."
  - q: "Can I use the same MCP server in different projects?"
    a: "Yes. Global servers in ~/.claude.json apply to all projects. Local .mcp.json — only to a specific one. For a team, .mcp.json in the repo is best — everyone gets the same configuration automatically."
---

## What is MCP

**MCP (Model Context Protocol)** is an open protocol that lets you connect external tools to Claude. Instead of Claude only knowing about files in your project, MCP servers give it access to databases, GitHub, the browser, Jira, Slack and much more.

The architecture is simple:

```
Claude Code <-> MCP client <-> MCP server <-> External service
```

## How to connect an MCP server

### Via CLI (quick)

```bash
# Add a server to the project config
claude mcp add <name> <command>

# Examples:
claude mcp add filesystem npx -y @modelcontextprotocol/server-filesystem /path/to/dir
claude mcp add github npx -y @modelcontextprotocol/server-github
```

### Via .mcp.json (recommended for teams)

Create `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}"
      }
    }
  }
}
```

This file is committed to the repository — everyone on the team gets the same tools.

## Useful MCPs for development

### GitHub MCP

```bash
claude mcp add github npx -y @modelcontextprotocol/server-github
```

What it can do:
- Read and create Issues and Pull Requests
- Browse code in the repository
- Manage branches and commits
- Search code on GitHub

Usage example:
```
"Look at open bugs labelled 'critical' and propose a fix plan"
"Create a PR with description for the current branch"
```

### PostgreSQL / SQLite MCP

```bash
# PostgreSQL
claude mcp add postgres npx -y @modelcontextprotocol/server-postgres

# SQLite
claude mcp add sqlite npx -y @modelcontextprotocol/server-sqlite --db-path ./db.sqlite
```

What it can do:
- Inspect the DB schema
- Run SQL queries
- Analyze data

Example:
```
"Show the tables with the largest row counts"
"Find N+1 problems in this code given the DB structure"
```

### Filesystem MCP

```bash
claude mcp add filesystem npx -y @modelcontextprotocol/server-filesystem /home/user/projects
```

Extended file access beyond the working directory — for example, to shared configs or other projects.

### Puppeteer / Playwright MCP

```bash
# Puppeteer
claude mcp add puppeteer npx -y @modelcontextprotocol/server-puppeteer

# Playwright (more powerful)
claude mcp add playwright npx -y @playwright/mcp
```

What it can do:
- Open pages in a browser
- Take screenshots
- Interact with the UI (clicks, input)
- Test web applications

Example:
```
"Go to localhost:3000 and verify the registration form works"
"Take a screenshot of the page and find visual bugs"
```

### Brave Search MCP

```bash
claude mcp add brave-search npx -y @modelcontextprotocol/server-brave-search
# Requires BRAVE_API_KEY
```

Web search right from the session — useful when you need to find current documentation or a fix for an error.

### Sentry MCP

```bash
claude mcp add sentry npx -y @modelcontextprotocol/server-sentry
```

Access to errors from Sentry:
```
"Show the latest 10 errors in production and propose fixes"
```

### Linear MCP

```bash
claude mcp add linear npx -y linear-mcp-server
```

Working with tasks in Linear:
```
"Create a task based on this bug"
"Which tasks in the sprint haven't been picked up yet?"
```

## Inspecting connected servers

```bash
# List all servers
claude mcp list

# Details of a specific server
claude mcp get github

# Remove a server
claude mcp remove github
```

Inside a session you can check available tools via `/mcp`.

## Security

MCP servers get access to your data — only connect trusted ones.

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}"
      }
    }
  }
}
```

Never hardcode credentials in `.mcp.json` — use environment variables. The file itself can be committed; the secrets cannot.

## Your own MCP server

If you need access to an internal system, you can write your own server — the MCP SDK is available for TypeScript and Python:

```bash
npm install @modelcontextprotocol/sdk
```

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({ name: "my-server", version: "1.0.0" }, {
  capabilities: { tools: {} }
});

server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "get_deploys",
    description: "Get latest deploys from the internal system",
    inputSchema: { type: "object", properties: {} }
  }]
}));

server.setRequestHandler("tools/call", async (req) => {
  if (req.params.name === "get_deploys") {
    // call to the internal API
    return { content: [{ type: "text", text: JSON.stringify(deploys) }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Summary

- MCP extends Claude Code with external tools: DBs, GitHub, browser, search
- `.mcp.json` in the project root — a convenient way to fix the server set for the team
- Most useful for development: GitHub, PostgreSQL, Playwright, Brave Search
- Secrets — only via environment variables, not in the config
- You can write your own MCP server for any internal service
