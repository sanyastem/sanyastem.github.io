---
layout: post
title: "Claude for QA engineers: the full workflow"
categories: qa
date: 2026-04-10
read_time: 12
difficulty: intermediate
series: "Claude for QA engineers"
part: 5
description: "A full day with Claude — from morning planning to evening report. CLAUDE.md for QA, custom skills, and integration with Jira, Postman, TestRail."
excerpt_text: "A full day with Claude: planning, test cases, data, bug report, report"
keywords: "claude workflow qa, claude jira, claude postman, qa automation, claude skills qa"
translation_of: "/qa/claude-qa-workflow/"
tldr:
  - "A typical QA day with Claude: sprint test planning in the morning, test cases from a PR description, JSON data, a bug report in 30 seconds, an evening report for the lead in 2 minutes."
  - "A CLAUDE.md file in the repo root stores the stack, environments, test accounts, and business rules — Claude Code reads it in every session and knows the project context."
  - "Custom skills are created in .claude/skills/name/SKILL.md: the /qa-testcases command generates test cases, /qa-bugreport formats a bug from a free-form description."
  - "Claude integrates with tools through formats: a JSON collection for Postman, Jira markdown for bugs, CSV for import into TestRail and Excel."
---

## A full day with Claude

Let's go through a typical QA engineer day and show where Claude saves time.

### 09:00 — Morning: planning

You open Jira, see sprint tasks. Copy them into Claude:

```text
Sprint 15 tasks:
1. SHOP-234: Add filter by clothing size
2. SHOP-235: Fix double-charge bug on card payment
3. SHOP-236: New "Returns" page
4. SHOP-237: Catalog loading optimization

Build a week's test plan.
Prioritize by business risk.
For each task: what to test, how long, which testing types.
```

A minute later you have a plan: payment bug first (critical), then new page, then filter, optimization at the end.

### 10:00 — Got a PR: analysis

The developer closed SHOP-234 (size filter). If you have repo access:

```text
Look at the latest commit. What changed?
Which features are affected? What might break?
Generate test cases based on the changes.
```

If no repo access — use the PR description:

```text
PR description:
- Added size filter (XS, S, M, L, XL, XXL)
- Filter combines with price filter
- When no items of selected size — message "Nothing found"
- Sizes are fetched from API

Write test cases. Include: functional, UI, edge, negative.
```

### 11:30 — Testing: need data

You need test products with various sizes:

```text
Generate JSON with 20 products for testing the size filter.
Fields: id, name, price, sizes (array), category, in_stock.

Include:
- Products with all sizes
- Product with one size
- Product with no sizes (empty array)
- Product with price 0
- Out-of-stock product
```

### 14:00 — Found a bug: format it

While testing you found: combining size + price filter, if you select size first, then price, then remove size — the list is empty.

```text
Format a bug report for Jira:

Product filter. Select size M → products shown.
Add price filter (100-500) → products filtered.
Remove size filter → list empty, although products in 100-500
without size filter should remain.
Chrome 125, staging.
```

Copied the result into Jira — bug filed in 30 seconds.

### 16:00 — Regression

Before release, regression must run:

```text
Release 2.15 contents:
- Size filter (new feature)
- Double-charge fix
- New returns page
- Catalog optimization

System modules: catalog, cart, payment, profile, orders.

Create a prioritized regression checklist.
Total time: 3 hours.
```

### 17:30 — Report

```text
Write a testing report for the lead. Short, 5-7 sentences.

Data:
- Tested: SHOP-234, SHOP-235, SHOP-236, SHOP-237
- Test cases run: 67
- Bugs found: 4 (1 major, 3 minor)
- Major: filter combination breaks the list (SHOP-234)
- No blockers
- Regression: clean
- Recommendation: ship after major bug fix
```

Done. The whole day — with Claude.

## CLAUDE.md for a QA project

If you use Claude Code with a repo (part 4), create a `CLAUDE.md` file in the project root. Claude reads it every time and gets the context.

QA-flavored example:

```markdown
# E-Shop — clothing online store

## Stack
- Backend: .NET 8 Web API
- Frontend: Angular 19
- Database: PostgreSQL 16
- Payments: Stripe
- Hosting: Azure

## Environments
- Dev: https://dev.eshop.example.com
- Staging: https://staging.eshop.example.com
- Prod: https://eshop.example.com

## Test accounts
- Customer: buyer@test.com / BuyerTest123!
- Admin: admin@test.com / AdminTest123!
- Manager: manager@test.com / ManagerTest123!

## Business rules
- Minimum order: 500
- Free shipping above 3000
- Max 10 items in cart
- 14-day return window
- Payment: card (Stripe), cash on delivery

## Critical modules (test thoroughly)
- Order placement + payment
- Registration / login
- Cart (totals, discounts)
- Catalog (filters, search)

## Known limitations
- Safari < 16: incorrect date display
- IE not supported
- Photo upload: max 5 MB, jpg/png
```

Now every time you ask Claude Code about the project, it already knows the context.

## Custom skills

Skills are saved commands for Claude Code. You type `/qa-testcases` instead of a long prompt.

### How to create one

In the project folder create:

```text
.claude/skills/qa-testcases/SKILL.md
```

File content:

```markdown
---
name: qa-testcases
description: Generate test cases from requirements or code
allowed-tools: Read, Grep, Glob
---

Generate test cases based on the given description
or file.

Include: positive, negative, edge, security.

Format: table with columns:
ID | Type | Title | Steps | Expected result | Priority
```

Now type `/qa-testcases payment form` — and Claude generates test cases.

### Useful skills for QA

**`/qa-bugreport`** — formats a bug from a description:

```markdown
---
name: qa-bugreport
description: Bug report from a free-form description
allowed-tools: Read, Grep, Glob
---

Format a bug report from the description.
Format: title, severity, steps, expected/actual,
environment, workaround.
```

**`/qa-checklist`** — testing checklist:

```markdown
---
name: qa-checklist
description: Testing checklist for a feature
allowed-tools: Read, Grep, Glob
---

Create a testing checklist.
Categories: functionality, validation, UI/UX, security,
performance, compatibility.
Format: checkboxes.
```

Make them once — use every day.

## Tool integration

### Claude + Postman

```text
Here's the swagger API documentation (or paste JSON):

Generate a Postman collection:
- For each endpoint: valid request + 3 invalid
- Pre-request script for auth
- Tests to verify responses (status code, required fields)

Format: JSON for Postman import.
```

### Claude + Jira

```text
Here are testing results (list of test cases with outcomes).

Create bug reports for each failed test case.
Format: Jira markdown.
Include: title, severity, steps, expected/actual.
```

```text
Here's a feature description. Write acceptance criteria for a Jira ticket.
Format: list of checkboxes (Jira checkbox format).
```

### Claude + TestRail

```text
Here are test cases (table).

Reformat for TestRail import:
- Section: [section name]
- Title, Preconditions, Steps, Expected Result
- Priority: 1-Critical, 2-High, 3-Medium, 4-Low
- Type: Functional / Regression / Smoke

Format: CSV for import.
```

### Claude + Excel/CSV

```text
Here's bug-tracker data for 3 months (paste or describe).

Create a summary:
- Bug count by severity (table)
- Count by module
- Average fix time
- Weekly trend

Format: CSV so I can paste into Excel and chart.
```

## What you've achieved

If you went through all 5 parts of the series, you can now:

- Generate test cases in **minutes**, not hours
- Format bug reports in **30 seconds** instead of 10 minutes
- Write test plans, regressions, and checklists — not from scratch
- Analyze project code **without knowing how to code**
- Find bugs **others miss** — because you see the code
- Write bug reports with **file and line numbers** — developers love it
- Prep manager reports in **2 minutes**

You didn't become a programmer. You became a QA who **understands the system from inside** and uses AI as a tool.

> Series complete. You went from your first browser prompt to the full Claude Code workflow. Start small — one command per day. A week later you won't be able to work without it.
