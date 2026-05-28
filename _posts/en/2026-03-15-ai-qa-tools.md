---
layout: post
title: "AI for QA engineers: exploratory testing and bug reports"
categories: qa
date: 2026-03-15
read_time: 6
difficulty: intermediate
series: "AI for manual QA engineers"
part: 2
description: "How AI helps with exploratory testing: invents scenarios you might have missed and helps describe bugs quickly and accurately."
excerpt_text: "AI as a partner for exploratory testing — scenarios, bug reports, reproduction"
keywords: "AI exploratory testing, ChatGPT bug report, QA exploratory testing, manual QA AI"
translation_of: "/qa/ai-qa-tools/"
---

## AI as a partner during a session

Exploratory testing is when there are no scripts — you test by hand, with your brain switched on. This is where AI is useful not as an automator, but as a **conversation partner**.

Before the session, ask:

```
I'm testing the personal account section: changing email, password,
linking/unlinking social accounts. The app is a mobile bank.

Suggest 15 unusual scenarios that are typically missed.
```

AI will come up with things you might not have thought of: changing email simultaneously from two devices, changing the password while the session expires, unlinking a social account during an active login through it.

## Finding edge cases

Ask AI to "break" any field:

```
We have a "Transfer amount" field. Currency is rubles.
Minimum 1 RUB, maximum 1,000,000 RUB.
What values should be tested?
```

AI will suggest: 0, 0.01, 0.99, 1.00, 1.01, 999,999.99, 1,000,000.00, 1,000,000.01, negative numbers, fractions with three decimal places, comma instead of dot, space inside the number.

You'd come up with some of these yourself — but not all of them.

## Generating ideas by feature type

```
I'm testing a "share document by link" feature.
The link can be password-protected or not, with a time limit.

Build a checklist: what to look out for when testing
"sharing" features in general?
```

AI knows the patterns and typical bugs — expired links, links after the document was deleted, access rights when the owner changes. Use it as a reminder.

## Quickly understanding an unfamiliar feature

You've been given OAuth 2.0 authorization to test, and you don't really get how it works:

```
Explain in simple terms how OAuth 2.0 authorization works.
What can go wrong from the user's point of view?
What to look out for when testing?
```

Five minutes — and you have a basic grasp of the mechanics and a list of risks.

## Writing bug reports

Instead of searching for words — dictate to AI what happened:

```
I went to my profile, clicked "Change avatar",
selected a 2 MB jpg file, clicked "Save" — got
the error "File too large", although the help says
the maximum is 5 MB.

Write a bug report:
- Title
- Reproduction steps (numbered list)
- Actual result
- Expected result
- Severity
```

You'll get a clean, structured report — all that's left is to review and submit.

## Help with reproduction

The bug doesn't always reproduce. Describe the situation — AI will suggest options:

```
Bug: the "Place order" button sometimes doesn't respond to clicks.
Reproduces about 1 in 5 times, no clear pattern.

What conditions might affect this? What should I try
to reproduce it consistently?
```

AI will suggest: slow connection, fast double-click, switch from mobile to desktop, authorization state, cart size.

> AI doesn't replace your tester's intuition — it widens your field of view. Ask it questions like an experienced colleague who's seen a lot.
