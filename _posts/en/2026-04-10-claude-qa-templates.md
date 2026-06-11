---
layout: post
title: "Claude for QA engineers: templates and advanced techniques"
categories: qa
date: 2026-04-10
read_time: 12
difficulty: intermediate
series: "Claude for QA engineers"
part: 3
description: "Ready-to-use prompt templates for QA, working with documentation, release prep, reporting, cross-browser testing, and career growth."
excerpt_text: "Ready-to-use prompt templates, reporting for managers, release checklists, and growth to middle QA"
keywords: "qa templates, testing prompts, test plan, regression, cross-browser testing, wcag, qa career"
translation_of: "/qa/claude-qa-templates/"
tldr:
  - "Six ready-made prompt templates: test cases, bug report, feature checklist, regression, test plan, and test data — replace the placeholders in brackets and send."
  - "Before a release Claude builds a 30-minute smoke checklist, a post-deploy production checklist, and gives a Go/No-Go recommendation based on test results."
  - "From a spec Claude extracts testable requirements with priority and an automatable flag, and builds a traceability matrix: requirement — test cases — coverage."
  - "Separate checklists for cross-browser testing (Chrome, Firefox, Safari, Edge), WCAG 2.1 level AA accessibility, and localization (RTL, date and number formats)."
faq:
  - q: "Which ready-made prompt templates does a QA engineer need?"
    a: "Six basic ones: test cases (a table with positive/negative/edge/security types), a Jira bug report, a feature checklist, a regression checklist, a test plan, and test data. Copy, replace the placeholders in square brackets, add your project context at the top — and send."
  - q: "How does Claude help prepare for a release?"
    a: "With three checklists: a 30-minute smoke test (2-3 critical checks per module), post-deploy production checks (site opens, SSL is valid, a test payment goes through, logs are clean), and a Go/No-Go recommendation. Give it the test results — say, 112 passed out of 120 with 2 open majors — and you get a decision with the risks explained."
  - q: "How do I extract testable requirements from a spec?"
    a: "Paste the document and ask Claude to extract all testable requirements: for each one — ID, wording, check type, priority, and whether it can be automated. Then, from the requirements list, Claude builds a traceability matrix (requirement — test cases — coverage — status) so you can see gaps in coverage."
  - q: "How do I test cross-browser compatibility and accessibility with Claude?"
    a: "Ask for a checklist covering Chrome, Firefox, Safari, and Edge (last 2 versions) at resolutions from 1920x1080 down to 360x800: layout, fonts, forms, animations, modals. For accessibility — a separate WCAG 2.1 level AA checklist: contrast, keyboard navigation, screen reader support, visible focus, label-input association."
  - q: "Can Claude help a QA engineer grow professionally?"
    a: "Yes, in three roles: a mentor that explains techniques like boundary value analysis with concrete examples; an interviewer that asks 10 middle-QA-level questions and reviews your answers; and an automation teacher that writes your first Python + Selenium test and explains every line for someone with no programming background."
---

## Ready-to-use prompt templates

Templates are prompts you adapt to your project. Copy, replace placeholders in square brackets, send to Claude.

### Template: test cases

```text
I'm testing: [feature description]
Platform: [web / mobile / API]
User: [user role]
Constraints: [limits, validations, business rules]

Write test cases in table format:
ID | Type | Title | Preconditions | Steps | Expected result | Priority

Types: positive / negative / edge / security
Priority: high / medium / low
Minimum 15 test cases.
```

### Template: bug report

```text
Format a bug report for Jira from this description:

[What happened — free text, however you want]

Format:
- Title (short, specific, starts with a verb)
- Severity: blocker / critical / major / minor
- Steps to reproduce (numbered)
- Expected result
- Actual result
- Environment: browser, OS, environment
- Frequency: always / sometimes / once
- Workaround (if any)
```

### Template: feature checklist

```text
Create a testing checklist for: [feature/page description]

Categories:
- [ ] Functionality (main scenario, alternatives)
- [ ] Validation (required fields, formats, limits)
- [ ] UI/UX (rendering, states, responsiveness)
- [ ] Security (access, injections, other users' data)
- [ ] Performance (large data, multiple clicks)
```

### Template: regression checklist

```text
Create a regression checklist for the release.

What changed: [list of tasks/PRs from the sprint]

System modules: [list main modules]

For each affected module:
- [ ] Smoke test (main scenario works)
- [ ] Related modules (what might break)
- [ ] Critical scenarios (payment, registration, login)

Set priority: what to check first.
```

### Template: test plan

```text
Build a test plan for the feature: [description]

Include:
1. Scope — what we test and what we DON'T test
2. Approach — types of testing (functional, UI, API, security)
3. Environments — where we test
4. Test cases — how many, which types
5. Entry/exit criteria
6. Risks — what could go wrong
7. Schedule — rough timeline
```

### Template: test data

```text
Generate test data for [form/API/table].

Fields: [list fields and types]
Constraints: [length, format, required]

Need:
- 5 fully valid sets
- 5 with invalid data (different errors)
- 5 with edge values
- 3 for security checks (XSS, SQL injection)

Format: [table / JSON / CSV / SQL INSERT]
```

### Adapting to your project

Before using a template, add project context at the start:

```text
Context: I'm testing a food delivery mobile app.
Platforms: iOS 16+, Android 12+.
Users: customer, courier, restaurant, admin.
Critical modules: order placement, payment, tracking.

[template below]
```

The more context — the more accurate the output.

## Working with documentation

### From spec — testable requirements

You have a 10-page document. Instead of reading and writing it down yourself:

```text
Here's a technical spec (or paste the text).

Extract all testable requirements. For each:
- Requirement ID
- Wording
- Check type (functional / UI / performance / security)
- Priority (high / medium / low)
- Can it be automated (yes / no)
```

### Traceability matrix

```text
Here's the requirements list:
REQ-01: User can register via email
REQ-02: User can log in with email + password
REQ-03: Password reset via email
[...]

Create a traceability matrix:
Requirement | Test cases | Coverage | Status
```

## Release prep

### Smoke test

```text
Create a smoke test checklist for [project name].

Main modules: [list]

For each module — 2-3 most critical checks.
The whole smoke test should take no more than 30 minutes.
```

### Staging vs Production

```text
Create a post-deploy production checklist:
- Site loads
- SSL certificate valid
- Login works
- Main business flow completes
- Payment system works (test transaction)
- Email notifications sent
- Logs free of critical errors
```

### Go/No-Go

```text
Here are pre-release test results:
- Total test cases: 120
- Passed: 112
- Failed: 5 (minor: 3, major: 2)
- Blocked: 3
- Open bugs: 2 major, 3 minor

Give a recommendation: Go or No-Go?
Explain why. What are the release risks?
```

## Reporting

### Summary for manager

```text
Write a testing summary for the project manager.
Language: simple, no technical jargon.

Data:
- Sprint: Sprint 14
- Tasks: [list]
- Tests run: 85
- Bugs found: 12 (2 critical, 4 major, 6 minor)
- Blockers: payment doesn't work in Firefox
- Regression: no issues

Format: 5-7 sentences, key findings and recommendations.
```

### Bug analysis

```text
Here's a list of bugs from the last 3 sprints:
[paste list]

Find patterns:
- Which module is the buggiest?
- Which bug type is most frequent?
- Is there a trend — getting better or worse?
- Where should we strengthen testing?
```

## Cross-browser, mobile, accessibility

### Cross-browser testing

```text
Create a cross-browser testing checklist for [page/feature].

Browsers: Chrome, Firefox, Safari, Edge (last 2 versions).
Resolutions: 1920x1080, 1366x768, 375x812 (iPhone), 360x800 (Android).

What to check in each browser:
- Layout not broken
- Fonts render
- Forms work
- Animations smooth
- Modals correct
```

### Mobile specifics

```text
What specific bugs occur in:
1. iOS Safari (latest)
2. Android Chrome
3. Mobile WebView (apps)

For each: a concrete bug example and how to check.
```

### Accessibility (WCAG)

```text
Create an accessibility checklist per WCAG 2.1 (level AA) for [page].

Categories:
- Text contrast
- Keyboard navigation
- Screen reader (alt text, aria-labels)
- Focus (visible, logical order)
- Forms (label-input pairing, error messages)
- Media (subtitles, controls)
```

### Localization

```text
Localization testing checklist:
- RTL languages (Arabic, Hebrew): layout not broken?
- Long strings (German): text doesn't get cut off?
- Date formats: DD.MM.YYYY vs MM/DD/YYYY
- Number formats: 1.000,50 vs 1,000.50
- Currencies: symbol before/after number
- Special chars in names: Ö, ñ, 日本語
```

## Growth and development

### Claude as a mentor

```text
Explain in simple terms what boundary value analysis is.
Give an example for an "Age" field (18 to 65).
Which values to test and why?
```

```text
What's the difference between smoke testing and regression testing?
When to use each? Give real project examples.
```

### Interview prep

```text
Ask me 10 questions as if it's a Middle QA interview.
After each answer — say what's good and what to add.
Topics: test design, API, SQL, processes, bug tracking.
```

### First steps into automation

Even if you're not a programmer, Claude helps you understand:

```text
Write a simple auto test in Python + Selenium for the scenario:
1. Open example.com
2. Enter login and password
3. Click "Sign in"
4. Verify the home page opened

Explain each line as if to someone who's never coded.
```

You don't have to automate right now. But understanding how it works makes you more valuable.

> In the next part — your first contact with the project repository. Don't panic: Claude reads the code, not you.
