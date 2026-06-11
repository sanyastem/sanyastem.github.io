---
layout: post
title: "AI for QA engineers: write test cases faster"
categories: qa
date: 2026-03-15
read_time: 5
difficulty: beginner
series: "AI for manual QA engineers"
part: 1
description: "How to use ChatGPT and other AI assistants to generate test cases, test data, and analyze requirements."
excerpt_text: "Generate test cases, test data, and find gaps in requirements with AI"
keywords: "AI testing, ChatGPT test cases, QA automation, test generation, prompt QA"
translation_of: "/qa/ai-qa-basics/"
tldr:
  - "AI generates 15–20 test cases from a feature description in seconds; the tester's job is to review them and add the business logic AI doesn't know."
  - "Three rules for a good prompt: give context (fields, limits, business rules), show a format example (ID | Title | Steps | Expected result), and iterate."
  - "AI finds problems in requirements before testing starts: ambiguities, missing acceptance criteria, edge cases, and security risks in a user story."
  - "From a stack trace AI drafts a bug report with steps, expected and actual results, and Severity, but a human always verifies the final cause and priority."
---

## AI doesn't replace the QA engineer — it removes the routine

Writing test cases by hand from a spec, inventing test data, drafting bug reports — AI does all of this in seconds. What's left for you is what AI can't do: knowing the business context, sensing UX, finding non-obvious scenarios.

## Generating test cases

Describe the feature — AI writes the cases:

```
Write test cases for a registration form.
Fields: email, password (min 8 characters), password confirmation.
Format: ID | Title | Steps | Expected result.
Cover: happy path, negative scenarios, boundary values.
```

AI will produce 15–20 cases. Your job is to review and add the business logic that AI doesn't know.

**What's good to delegate to AI:**
- Test cases from a user story or spec
- Test data (names, phones, invalid formats)
- Regression checklists
- Bug reproduction steps

## How to get a good result

Vague prompt → vague result. Three rules:

**Give context:**
```
# Bad
Write tests for the cart.

# Good
Write test cases for the cart of an online store.
The user can: add an item, change quantity,
remove, apply a promo code (10% discount, doesn't work
on discounted items), place an order.
Format: Gherkin (Given / When / Then).
```

**Show a format example:**
```
Write in this format:
TC-001 | Successful login | 1. Open /login
2. Enter valid credentials 3. Click "Log in"
| Redirect to home page, greeting in header
```

**Iterate:**
```
Good. Now add 5 negative scenarios for the password.
Note: after 3 failed attempts the account is locked for 15 minutes.
```

## AI for requirements analysis

Upload the spec and ask it to find problems before testing starts:

```
Here is the user story:
"As a user I want to reset my password via email."

Find: ambiguities, missing acceptance criteria,
edge cases, and security risks.
```

AI will find gaps that would have turned into bugs.

## Automating bug reports

```
Here is the error log: [paste stack trace]

Write a bug report:
- Title (short, to the point)
- Reproduction steps
- Actual and expected result
- Severity and Priority with rationale
- Possible causes
```

> AI describes "what" well, but doesn't know "why" in the context of your project. Always verify the final cause and priority yourself.
