---
layout: post
title: "Claude Code: building your own MCP server from scratch"
categories: ai
date: 2026-05-08
read_time: 10
difficulty: intermediate
series: "Claude Code: complete guide"
part: 5
description: "Step-by-step guide: write an MCP server in TypeScript, hook it into Claude Code, debug via MCP Inspector, and share with your team."
excerpt_text: "Your own MCP server — when the ready-made ones aren't enough: real example with searching internal docs, debugging, and npm publishing"
keywords: "MCP server, model context protocol, build your own, claude code custom mcp, mcp sdk typescript, mcp inspector"
translation_of: "/ai/claude-code-mcp-build/"
---

In [the previous part](/en/tools/claude-code-mcp/) we connected existing MCP servers. But sometimes you need your own: internal API, niche database, corporate service with no public connector. Let's build a working server from scratch — in one sitting.

## When to write your own vs use a ready-made one

| Situation | Solution |
|---|---|
| Need GitHub / Postgres / Slack / Jira | Existing one from the registry |
| Internal REST API without OpenAPI | Your own |
| Local utility (CLI, script) with a specific interface | Your own |
| DB with non-standard auth | Your own (or fork an existing one) |
| One or two simple calls — a script will do | Skill or Bash, not MCP |

A custom MCP is worth it when the tool will be reused: a team, multiple projects, recurring tasks. For one-off work just write a regular script and call it from Bash.

## What we'll build

A `docs-search` server — searches local `.md` files in a folder. Two tools:

- `search_docs(query, limit)` — full-text search, returns top-N matches with snippets
- `read_doc(path)` — reads a specific file

Real case: internal teams keep wikis in `/docs/` of a repo, and Claude needs to grep through them without loading everything into context.

## Step 1. Project skeleton

```bash
mkdir mcp-docs-search && cd mcp-docs-search
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node tsx
npx tsc --init
```

In `package.json` add:

```json
{
  "type": "module",
  "bin": {
    "mcp-docs-search": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts"
  }
}
```

Key `tsconfig.json` options:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  }
}
```

## Step 2. Minimal server

```typescript
// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "docs-search", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ping",
      description: "Health check. Returns pong.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === "ping") {
    return { content: [{ type: "text", text: "pong" }] };
  }
  throw new Error(`Unknown tool: ${req.params.name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

Run `npm run dev` — the server waits for messages on stdin. There's a separate tool for testing (see step 5), continuing.

## Step 3. Real tools

Replace `ping` with useful `search_docs` and `read_doc`. For search, a simple `grep`-style pass — enough for thousands of files, swap to an index later for larger volumes.

```typescript
// src/index.ts (full version)
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import { resolve, relative } from "node:path";

const DOCS_DIR = resolve(process.env.DOCS_DIR ?? "./docs");

const server = new Server(
  { name: "docs-search", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_docs",
      description:
        "Searches the content of all .md files in DOCS_DIR. Returns matches with a context snippet.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search phrase" },
          limit: { type: "number", default: 5, description: "Max results" },
        },
        required: ["query"],
      },
    },
    {
      name: "read_doc",
      description: "Reads a file from DOCS_DIR by relative path.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Relative path to a .md file" },
        },
        required: ["path"],
      },
    },
  ],
}));

async function searchDocs(query: string, limit = 5) {
  const q = query.toLowerCase();
  const results: Array<{ path: string; snippet: string }> = [];

  for await (const file of glob("**/*.md", { cwd: DOCS_DIR })) {
    const full = resolve(DOCS_DIR, file);
    const text = await readFile(full, "utf8");
    const lower = text.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) continue;

    const start = Math.max(0, idx - 80);
    const end = Math.min(text.length, idx + q.length + 80);
    results.push({
      path: relative(DOCS_DIR, full),
      snippet: text.slice(start, end).replace(/\s+/g, " ").trim(),
    });
    if (results.length >= limit) break;
  }
  return results;
}

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === "search_docs") {
    const { query, limit = 5 } = args as { query: string; limit?: number };
    const results = await searchDocs(query, limit);
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  }

  if (name === "read_doc") {
    const { path } = args as { path: string };
    const full = resolve(DOCS_DIR, path);
    if (!full.startsWith(DOCS_DIR)) throw new Error("Path traversal blocked");
    const text = await readFile(full, "utf8");
    return { content: [{ type: "text", text }] };
  }

  throw new Error(`Unknown tool: ${name}`);
});

await server.connect(new StdioServerTransport());
```

<div class="warn-block">
<span class="tip-icon">⚠️</span>
<p>The <code>full.startsWith(DOCS_DIR)</code> check is critical. Without it <code>read_doc</code> with <code>path: "../../etc/passwd"</code> will read anything. An MCP server runs with your user's privileges.</p>
</div>

## Step 4. Hook into Claude Code

Compile: `npm run build`. You get `dist/index.js`. Register in the project's `.mcp.json`:

```json
{
  "mcpServers": {
    "docs-search": {
      "command": "node",
      "args": ["./mcp-docs-search/dist/index.js"],
      "env": {
        "DOCS_DIR": "./docs"
      }
    }
  }
}
```

Restart Claude Code — inside the session type `/mcp` and make sure `docs-search` shows 2 tools.

Now this works:

```
Find everything in our docs about staging deploys and assemble a checklist
```

Claude will call `search_docs("staging deploy")` → take the top-5 files → if needed read them fully via `read_doc`.

## Step 5. Debugging with MCP Inspector

Launching Claude Code on every iteration is slow. There's Inspector — a UI showing server requests/responses in real time:

```bash
npx @modelcontextprotocol/inspector node ./dist/index.js
```

A browser opens. Left side — tool list, right side — form to call and raw JSON response. You see the full MCP protocol frame, errors, timings.

<div class="tip-block">
<span class="tip-icon">💡</span>
<p>Inspector is the de facto standard for MCP development. Before commit, run all tools through it with edge cases: empty query, missing path, huge result.</p>
</div>

## Step 6. Logging

`stdout` is reserved for the protocol — your `console.log` will break the parser on Claude's side. Log to `stderr` or a file:

```typescript
function log(msg: string, data?: unknown) {
  process.stderr.write(`[docs-search] ${msg} ${data ? JSON.stringify(data) : ""}\n`);
}

log("server started", { docsDir: DOCS_DIR });
```

In Claude Code MCP server logs are visible via `claude mcp logs docs-search`.

## Step 7. Publish for the team

If the server is useful beyond you, publish it on npm:

```bash
# package.json
{
  "name": "@your-org/mcp-docs-search",
  "version": "0.1.0",
  "bin": { "mcp-docs-search": "./dist/index.js" }
}

npm publish --access=public
```

Now in your team's `.mcp.json`:

```json
{
  "mcpServers": {
    "docs-search": {
      "command": "npx",
      "args": ["-y", "@your-org/mcp-docs-search"],
      "env": { "DOCS_DIR": "./docs" }
    }
  }
}
```

Nobody clones anything — `npx` pulls the package on first run.

## What else MCP does

We only did **tools**, but the protocol is broader:

| Capability | When to use |
|---|---|
| **Tools** | Side-effect actions (search, write, API call) |
| **Resources** | Read-only data the model can "read" (files, DB rows) |
| **Prompts** | Predefined prompt templates with parameters |
| **Sampling** | The server asks the model to perform a sub-task |

Resources map well to "open tickets list" or "migrations list" — you hand out URIs, Claude decides when to load. Prompts are handy for templates like "code review by our rules" — but Skills usually cover that.

## Summary

- A custom MCP is worth it when the tool will be reused
- TypeScript skeleton: `@modelcontextprotocol/sdk` + `StdioServerTransport` + two handlers
- Security: always validate paths and never trust input
- Logs go to `stderr` only, otherwise you break the protocol
- Debug via `@modelcontextprotocol/inspector`
- Share with the team via npm publish + `.mcp.json` with `npx`
- Tools cover 80% of cases; resources/prompts — when you need read-only access or templates
