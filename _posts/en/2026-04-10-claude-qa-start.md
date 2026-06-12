---
layout: post
title: "Claude for QA engineers: starting without code"
categories: qa
date: 2026-04-10
read_time: 10
difficulty: beginner
series: "Claude for QA engineers"
part: 1
description: "How a manual QA engineer can start using Claude — no terminal, no code, through the browser. First commands and prompt templates."
excerpt_text: "Start working with Claude — no code, through the browser. 5 first commands for a QA engineer"
keywords: "claude, QA engineer, qa, manual testing, ai testing, test cases, bug report"
translation_of: "/qa/claude-qa-start/"
tldr:
  - "You can start without a terminal or code: sign up at claude.ai in the browser; the free plan is enough for a tester's first tasks."
  - "A prompt formula for 90% of tasks: what I'm testing + platform + user role + desired output; the more business rules in the context, the more accurate the answer."
  - "5 first commands: test cases for a registration form, a bug report from a free-form description, a 40–50 item cart checklist, test emails, and a console error breakdown."
  - "The Projects section in claude.ai stores the spec and a system instruction — every new chat inside the project gets that context automatically."
faq:
  - q: "Does a QA engineer need to know how to code to work with Claude?"
    a: "No. A browser is enough: open claude.ai, sign up with a Google account or email, and start working. No terminal, no package installs, no programming languages, no API keys — and the free plan covers a tester's first tasks."
  - q: "How do I write a good testing prompt?"
    a: "Use the formula that covers 90% of tasks: what I'm testing + platform + user role + desired output. Add business rules (limits, validations, account lockout after 5 failed attempts) and the answer format — table, Gherkin, or checklist. A bare prompt like 'write test cases for login' produces useless generic output."
  - q: "Which tasks should a QA engineer hand to Claude first?"
    a: "Five commands: test cases for a registration form (returns a table of 20-30 cases), a bug report from a free-form description, a 40-50 item cart checklist with P1-P3 priorities, test data for an email field (valid, invalid, boundary), and a plain-language breakdown of a confusing console error."
  - q: "What is Projects in claude.ai and why does a tester need it?"
    a: "Projects is a folder where you upload files (specs, user stories) and write a system instruction with context: product, platform, user roles, test case format. Every new chat inside the project gets that context automatically — no need to repeat 'I'm testing an online store' in every conversation."
  - q: "What can't Claude do in testing?"
    a: "It doesn't see the screen or click buttons, doesn't know your project's business context, and can make mistakes — inventing nonexistent constraints or misjudging severity. Review every result, and never paste real user data, passwords, or tokens. The working scheme: Claude generates 80%, you add 20% from your own experience."
---

## Why a QA engineer needs an AI assistant

If you're a manual QA engineer, most of your work is text. Test cases, checklists, bug reports, test data, clarifying questions to developers. By various estimates, 60% of a QA's working time goes to documentation and only 40% to actual testing.

Claude takes the text routine off your hands. You describe the task — it generates a structured result. Not perfect, but 80% ready. What's left for you is to review, fill in project context, and submit.

This isn't a replacement for the QA engineer. AI doesn't know your product, doesn't see the screen, doesn't understand business logic. But it can:

- Quickly generate test cases from a feature description
- Format bug reports from messy notes
- Invent test data for edge cases
- Find gaps in requirements
- Explain unclear errors and logs

You're a QA engineer, and you don't need code. That's fine. Claude works through a regular chat.

## How to start

### claude.ai — through the browser

The simplest way. Open [claude.ai](https://claude.ai), sign up via Google account or email. That's it, you can work.

The free tier gives you a limited number of messages per day — enough to start. If you like it, the Pro subscription removes limits and gives access to the most powerful model.

What you need to know:

- **New chat** — every time it's a clean context. Claude doesn't remember past conversations
- **Long context** — you can paste entire specs, user stories, error logs
- **Projects** — you can upload project files (specs, documentation) and Claude will use them in every conversation

### Desktop app

Claude is available as an app for macOS and Windows. Download from [claude.ai/download](https://claude.ai/download). Works the same as in the browser, but it's more convenient to switch between windows.

### What you DON'T need

- A terminal — not needed
- Installing packages — not needed
- Knowledge of programming languages — not needed
- API keys — not needed

Just a browser and a keyboard. If you can write in a messenger — you can work with Claude.

> There's also [Claude Code](/en/ai/claude-code-setup/) — a tool for developers that runs in the terminal and can edit files in a project. We'll get to it in parts 4-5, when we talk about automation. For now, forget about it.

## Context — the main rule

The most important thing to understand: **the more context you give, the better the result**. Claude doesn't see your project, doesn't know your team, hasn't read the spec. All it knows is what you wrote in the message.

### The good prompt formula

Remember the template:

```text
I'm testing [exactly what].
Platform: [web / mobile / desktop].
User: [role].
Need: [specific result].
```

This template works for 90% of tasks. Plug in your data — get a relevant result.

### Bad prompt vs good prompt

Bad:

```text
write test cases for login
```

Claude will produce something generic and template-like. Test cases for "some login" without details — useless boilerplate.

Good:

```text
I'm testing the login form on an online store.
Web app, desktop browser.
User: customer.

Fields:
- Email (required)
- Password (required, minimum 8 characters)

Buttons:
- "Log in"
- "Forgot password" — leads to /reset-password
- "Sign up" — leads to /register

After 5 failed attempts the account is locked for 30 minutes.

Write test cases: positive, negative, boundary values.
Format: ID | Title | Steps | Expected result.
```

The difference is like the question "tell me about the weather" vs "what's the weather tomorrow in Minsk, do I need a jacket?". A specific question — a specific answer.

### What to include in context

- **What you're testing** — feature, module, screen name
- **Business rules** — restrictions, limits, user roles
- **Technical details** — platform, browser, API version
- **Response format** — table, Gherkin, checklist, free text
- **Scope** — what to cover: only happy path or boundaries too

## 5 first commands for a QA engineer

Here are five tasks you can hand off to Claude right now. Each — with a specific prompt.

### 1. Test cases for a registration form

```text
I'm testing the registration form in a mobile banking app.
Platform: iOS and Android.
User: new client.

Fields:
- Name (2–50 characters, only letters and hyphen)
- Phone (format +375XXXXXXXXX)
- Email (optional)
- Password (min 8 characters, uppercase, digit, special character)
- Repeat password

There's a checkbox to agree to the terms (required).
There's a CAPTCHA after 3 failed attempts.

Write test cases: positive, negative, boundary.
Format: table with columns ID, Title, Preconditions, Steps, Expected Result.
```

Claude will return a table with 20-30 cases. There will be validation checks for each field, boundary lengths, password mismatch, empty required fields, special characters in name. Your job is to add cases specific to your bank (for example, phone verification via SMS).

### 2. Bug report from free-form description

```text
Format a bug report from my description.

Here's what happened: went to the cart, clicked "Place order",
selected courier delivery, entered the address, clicked "Next".
The page hung for 10 seconds, then showed the error
"Failed to calculate delivery cost".
Pickup works fine.
The bug appeared after yesterday's release.
Browser: Chrome 124, Windows 11.
Environment: staging.

Format:
- Title
- Environment
- Preconditions
- Reproduction steps
- Actual result
- Expected result
- Severity / Priority with rationale
```

Claude will structure your notes into a clean bug report. It will suggest Severity (most likely Major — blocks ordering for some users) and Priority. Check whether it matches your team's policy.

### 3. Checklist for testing the cart

```text
Build a checklist for testing the cart of an online store.

Functionality:
- Adding an item (from the catalog and from the product card)
- Changing quantity (from 1 to 99, no more than stock)
- Removing an item
- Promo code (% discount, fixed discount, free shipping)
- Promo code can't be applied to discounted items
- Recalculation of the total on any changes
- Transition to checkout

Format: checklist grouped by blocks.
Mark the priority of each check: P1 (critical), P2 (important), P3 (nice to have).
```

You'll get a structured checklist of 40-50 items, grouped by blocks. Easy to import into TestRail or any other TMS. Claude is usually good at setting priorities — P1 for total calculation and checkout, P3 for UI minor things.

### 4. Test data for an email field

```text
Generate test data for an email field.
Maximum length is 254 characters.
Used for registration in a web app.

I need:
- 5 valid emails (different formats: with dot, with plus, with digits)
- 10 invalid emails (no @, two @, spaces, Cyrillic, special characters, empty string)
- 3 boundary cases (max length, min length, exactly at the boundary)

Format: table — Value | Type (valid/invalid/boundary) | What it checks
```

Claude will return a table with ready-made test data. No need to come up with emails with two at-signs yourself or check the maximum length of a domain. Copy — paste into the test.

### 5. "Explain this error"

```text
I'm a manual QA engineer, not a developer. Explain in simple terms
what this error means and what I should write in the bug report.

Error from the browser console:

Uncaught TypeError: Cannot read properties of undefined (reading 'map')
    at ProductList.render (ProductList.jsx:24)
    at renderWithHooks (react-dom.development.js:16305)
    at mountIndeterminateComponent (react-dom.development.js:20074)

On the catalog page instead of the product list — an empty screen.
```

Claude will explain: the app tries to display the product list, but the data didn't come from the server (or came in the wrong format). The `ProductList` component on line 24 expects an array but got `undefined`. It will tell you what to write in the bug report, including the file and line reference.

This is especially useful when a developer has thrown a log at you and asked "what did you see?" — you can answer to the point, not "I'm not a programmer".

## Iteration — the second rule

Claude's first answer is a draft. Not the final result. Keep the conversation going:

```text
Good, but add more cases for multilingual support — 
our interface is in Russian, Belarusian, and English.
```

```text
Rewrite in Gherkin format. Need it for Cucumber.
```

```text
Remove API cases — I'm only testing through the UI.
```

```text
Group by priority: P1 first, then P2.
And add a "Test data" column to each case.
```

Each clarification brings the result closer to what you need. Claude remembers the entire conversation within one chat, so you don't need to repeat the context.

Three or four iterations — and you've got a finished artifact you can take to Jira.

## Organizing work: Projects

claude.ai has a **Projects** section. It's like a folder where you can upload files and write a system instruction. Each new chat inside the project automatically gets that context.

How to use it for testing:

1. Create a project, name it after the product — for example, "QA: Online Store"
2. Upload the spec, specifications, user stories in text format
3. In the system instruction, write the basic context:

```text
You're helping a manual QA engineer.
Project: online electronics store.
Platform: web (React), mobile app (React Native).
Users: customers, managers, administrators.
Test case format: ID | Title | Steps | Expected Result.
Response language: English.
```

Now in every new chat inside the project you don't need to repeat "I'm testing an online store, platform web..." — Claude already knows.

You can create separate projects for different products or for different task types (one project for test cases, another for bug reports).

## What Claude can't do

Before you start delegating everything in sight, here are the boundaries:

### Doesn't see the screen

Claude works only with text. It can't click a button, open a browser, scroll a page. Manual testing is still you.

You can paste a screenshot into the chat (claude.ai supports images), and Claude will describe what it sees. But this isn't a replacement for actually walking through a test case.

### Doesn't know business context

Claude doesn't know that in your project the promo code `WELCOME10` gives a discount only to new users, and `VIP30` — only for users with a purchase history above 50,000 rubles. If you don't tell it — it won't take that into account.

Always add business rules to the prompt. The more detail, the better.

### Can be wrong

Claude confidently generates test cases, but it can:

- Invent restrictions that don't exist
- Miss an important scenario
- Wrongly estimate severity
- Suggest an impossible reproduction step

Every result needs to be reviewed. This is a tool to speed you up, not for blind trust.

### Doesn't replace your expertise

You know where the "soft spots" are in the application. You know which bugs have already happened and might come back. You know which flow users use most often. AI doesn't know this.

Best scheme: Claude generates 80% — you add 20% from your experience.

### Confidentiality

Don't paste real user data, passwords, tokens, or API keys into Claude. If you need to show data structure — replace real values with fake ones. Instead of a real customer's email write `test.user@example.com`. This is a security rule, not a recommendation.

## Cheat sheet

Short checklist to get started:

1. Open [claude.ai](https://claude.ai) and sign up
2. Use the context formula: **what you're testing + platform + user + what you need**
3. Start with a specific task — test cases for the feature you're testing right now
4. Iterate — refine, add details, change the format
5. Create a Project for your product, upload the spec
6. Always check the result — Claude is an assistant, not an oracle

## What's next

In the next parts of the series we'll go deeper:

- **[Part 2](/en/qa/claude-qa-daily/)** — advanced prompts: templates for regression, smoke tests, API testing via Postman
- **[Part 3](/en/qa/claude-qa-templates/)** — Claude for requirements analysis and sprint planning preparation
- **Part 4-5** — [Claude Code](/en/qa/claude-qa-workflow/): when a QA engineer is ready to automate

> Try it right now: open claude.ai and ask it to write test cases for the last feature you tested. Use the context formula from this article. The difference from a "bare" prompt will be obvious.
