---
layout: post
title: "Claude for QA engineers: the repository — next level"
categories: qa
date: 2026-04-10
last_modified_at: 2026-05-24
read_time: 15
difficulty: intermediate
series: "Claude for QA engineers"
part: 4
description: "You've been given repo access — how to use Claude Code to analyze code, generate test cases from real logic, and find bugs in code."
excerpt_text: "Repo access + Claude Code = test cases from real code, not from documentation"
keywords: "claude code, qa repository access, qa git, test cases from code, PR analysis, finding bugs in code"
translation_of: "/qa/claude-qa-repo/"
tldr:
  - "Installing Claude Code: curl -fsSL https://claude.ai/install.sh | bash (Windows: install.ps1 via irm), then git clone, cd into the project folder, and the claude command."
  - "Claude Code reads the code for the tester: it finds all API endpoints, user roles, and validations — including ones missing from the documentation."
  - "Test cases from code beat documentation: it surfaces mismatches like 'password min 6 characters on the frontend, 8 on the backend' and fields without validation — ready-made bugs."
  - "From git history Claude shows what changed over the week and what might break; from a stack trace it opens the file and the exact line causing the bug (OrderService.cs:47)."
faq:
  - q: "Why would a tester need repo access if they can't read code?"
    a: "Code doesn't lie, documentation goes stale: the code shows the real validations, the places where validation is missing (that's where the bugs are), and exactly what changed in a release. You don't read the code yourself — Claude Code reads it for you and answers in plain language, and read-only access means you can't break anything."
  - q: "How do I install Claude Code?"
    a: "Install Node.js from nodejs.org, open a terminal, and run curl -fsSL https://claude.ai/install.sh | bash (on Windows in PowerShell: irm https://claude.ai/install.ps1 | iex). Then git clone with the repository URL, cd into the project folder, and run the claude command. The old npm install -g method is no longer recommended."
  - q: "How do I get test cases from code instead of documentation?"
    a: "Ask Claude Code to find all validations for a form: which field, which rule, which error message — it checks both frontend and backend. Mismatches like 'password minimum 6 characters on the frontend but 8 on the backend' or a phone field with no validation at all are ready-made bugs that no document mentions."
  - q: "How does Claude Code help me figure out what to test in a new release?"
    a: "It reads git history and tells you what changed over the week: which files, which features are affected, what might break. Given a list of changed files (say, PaymentService.cs and DiscountCalculator.cs), it does a risk assessment and suggests which test cases to run in regression."
  - q: "Can I find the exact cause of a bug from a stack trace?"
    a: "Yes: paste an error like NullReferenceException at OrderService.cs:line 47 — Claude opens the file, shows the line, and explains the cause, for example, Customer can be null if the user deleted their account. A bug report with the file and line number saves the developer an hour of digging."
---

## Why QA should look at the code

Up to this point you worked with Claude in a browser — wrote prompts from your head, based on docs and requirements. That's fine, but it has a ceiling.

Docs get stale. Requirements are incomplete. The developer added validation that's not in the task. Or forgot to add it — and there's a hole in the code.

When you have access to the project code:
- You see the **real** validations, not the ones in a doc
- You find places where validation is **missing** — that's where the bugs are
- You understand **exactly** what changed in the new release
- You write bug reports with **file and line numbers** — devs love that

And the main point: **you don't have to read the code yourself**. Claude Code reads it for you and answers in plain English.

## What is a repository

If you've never worked with code — here's a simple explanation.

**Repository** — a folder with all project files. Code, configs, tests — all in one place.

**Git** — version control. Like Google Docs revision history, but for code. You can see who changed what and when.

**Read-only access** — you can look but can't break anything. Relax.

Typical structure:
```text
project/
├── src/              — source code
│   ├── controllers/  — request handling logic
│   ├── models/       — data structure
│   ├── services/     — business logic
│   └── validators/   — data checks ← the interesting part for you
├── tests/            — auto tests (peek at scenarios)
├── docs/             — documentation
└── README.md         — project overview
```

You don't need to understand every file. You need to know that **Claude Code can read them all** and answer your questions.

## Installing Claude Code

Step by step, no panic.

### 1. Install Node.js

Go to nodejs.org, download the LTS version, install like a regular program (Next → Next → Finish).

### 2. Open a terminal

- **Windows:** press Win, type "cmd" or "PowerShell", open
- **macOS:** Spotlight (Cmd+Space), type "Terminal"

A terminal is a text interface. You type a command, hit Enter, get a result. Nothing scary.

### 3. Install Claude Code

Type in the terminal and press Enter:

```text
curl -fsSL https://claude.ai/install.sh | bash
```

On Windows (PowerShell):

```text
irm https://claude.ai/install.ps1 | iex
```

Wait a couple minutes. Done. (The old `npm install -g` method is no longer recommended.)

### 4. Clone the repository

Ask the developer for a repo link. Type:

```text
git clone https://github.com/company/project-name.git
```

A `project-name` folder appears with project files.

### 5. Run Claude Code

```text
cd project-name
claude
```

That's it. You're inside the project, and Claude sees all the files.

If something breaks — open claude.ai in a browser and ask: "I'm trying to install Claude Code, I get this error: [paste error]. Help."

## Tell me about the project

First thing after starting — get familiar with the project.

### Big picture

```text
Tell me about this project. What is it? What's the tech stack?
What are the main modules? Explain in plain English.
```

Claude reads project files and answers: "This is an online store on .NET 8 + Angular 19 + PostgreSQL. Main modules: product catalog, cart, Stripe payment, user profile."

### Structure

```text
Show me the folder structure and explain what's in each folder.
Focus: where the logic is, where the API is, where validations are.
```

### API endpoints

```text
Find all API endpoints in the project.
For each show: method, URL, what it does.
```

Now you know every endpoint — including those not in the docs.

### User roles

```text
What user roles exist in the system?
Where are access rights checked? Which endpoints are available to each role?
```

## Test cases from code

The key advantage. You generate test cases not from docs but from what's **actually in the code**.

### Form validations

```text
Find all validations for the registration form.
Show: field, rule, error message.
```

Claude finds ALL checks — both frontend and backend. It may turn out that:
- Email is regex-validated on frontend but not on backend
- Password is min 6 chars on frontend, min 8 on backend
- The "phone" field isn't validated at all

Each discrepancy — potential bug.

### Limits

```text
What are the file upload limits in this project?
Size, type, count. Show me where this is set in code.
```

Now you know: max 10 MB, only jpg/png/pdf, up to 5 files. And you know it from code, not from docs that might lie.

### Comparison

Test cases from docs vs from code:

| From docs | From code |
|-----------|-----------|
| "Password min 8 chars" | Min 8, max 128, required: uppercase, digit, special char |
| "Email is validated" | Regex on frontend, MX check on backend, uniqueness check in DB |
| Not mentioned | Rate limit: 5 login attempts, 15-min block |

Code doesn't lie. Docs can.

## Analyzing changes

### What changed in the last release

```text
Show me what changed over the last week.
Which files, which features are affected?
What might break because of these changes?
```

Claude looks at git history and says: "Payment module changed (3 files), discount calculation logic updated, new export API endpoint added."

Now you know what to test: payment, discounts, the new endpoint + regression of adjacent modules.

### Risk assessment

```text
Here's the list of changed files:
- PaymentService.cs
- DiscountCalculator.cs
- OrderController.cs

Assess the risk of each change.
What might break? Which test cases to run?
```

## Finding problem areas

Claude can analyze code for common issues.

### Security

```text
Check API endpoints for security issues:
- SQL injection
- Missing authorization
- Access to other users' data (IDOR)
- XSS in responses
```

### Error handling

```text
Find places in code with no error handling.
Where could a 500 error fly out due to an unhandled exception?
```

Each such place — a ready-to-go test case.

### Missing validation

```text
Which inputs are NOT validated?
Show fields/parameters that are accepted without checks.
```

No validation = anything can be sent = bug.

## Understanding errors via code

### Stack trace → precise cause

Previously you pasted stack traces into Claude and got general explanations. Now Claude sees the code and can show you the **exact line**.

```text
While testing I got the error:

NullReferenceException at OrderService.cs:line 47

Show me that file, line 47, and explain the cause.
What data could trigger this error?
```

Claude opens the file, shows the line and says: "Line 47 accesses order.Customer.Address, but Customer can be null if the user deleted their account. Test scenario: create order → delete account → try to pay."

### Bug report with file and line

Now your bug report looks like this:

**Title:** NullReferenceException when paying for deleted user's order

**Suspected cause:** OrderService.cs:47 — no null check on Customer

The developer gets the bug and knows where to look right away. You save them an hour of work.

> Now you're not just a QA — you're a QA who understands the system from inside. In the final part — full workflow with Claude, your own skills, and integration with tools.
