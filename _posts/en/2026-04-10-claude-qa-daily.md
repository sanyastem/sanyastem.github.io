---
layout: post
title: "Claude for QA engineers: daily tasks"
categories: tools
date: 2026-04-10
read_time: 15
difficulty: beginner
series: "Claude for QA engineers"
part: 2
description: "How to use Claude every day — test cases from user stories, bug reports, test data, API work, and error analysis."
excerpt_text: "Test cases, bug reports, test data — a full workday with Claude"
keywords: "claude testing, test cases, bug report, test data, qa daily, manual qa engineer"
translation_of: "/tools/claude-qa-daily/"
---

## Morning: planning the day's testing

First thing in the morning — you check sprint tasks. Instead of writing the test plan yourself, hand it to Claude.

```text
Here's a Jira user story:

"As a shopper, I want to filter products by price
so I can quickly find items within my budget.

Acceptance criteria:
- Slider with min and max price
- Manual price input fields
- Filtering without page reload
- 'Clear' button to reset the filter"

Build a test plan for this task.
Include: what we check, priority, rough time estimate.
```

Claude returns a structured plan: smoke test first (slider works), then functional checks, then edge cases, then UI.

If you have multiple tasks — ask what to test first:

```text
The sprint has 4 tasks:
1. Product filter by price
2. Profile avatar change
3. Fix for double payment bug
4. New "About us" page

Rank testing priority. Consider: business risk,
complexity, affected modules.
```

## Test cases from requirements

The main daily task. You receive a feature description — you need test cases.

### From a user story

```text
I'm testing the registration form in a banking mobile app.
Platforms: iOS and Android.
Fields: first name, last name, phone, email, password, password confirm.
Has a "Accept terms" checkbox (required).
After registration — SMS confirmation.

Write test cases in table format:
ID | Type | Title | Steps | Expected result | Priority
Types: positive, negative, edge.
Include at least 15 test cases.
```

Claude produces a table. A snippet of what you'd get:

| ID | Type | Title | Steps | Expected result | Priority |
|----|------|-------|-------|-----------------|----------|
| TC-01 | Positive | Successful registration | 1. Fill all fields correctly 2. Check the box 3. Tap "Register" | SMS code sent, navigate to confirmation screen | High |
| TC-02 | Negative | Empty name field | 1. Leave "First name" empty 2. Fill the rest 3. Tap "Register" | Error "Enter your first name" | High |
| TC-03 | Edge | Password exactly 8 chars | 1. Enter an 8-char password (minimum) 2. Fill the rest | Registration succeeds | Medium |

### From a screen description

If you don't have a user story but you have a mockup or screen description:

```text
"Cart" screen description:
- Product list with image, name, price, quantity
- +/- buttons to change quantity
- "Delete" button for each item
- Promo code — input field + "Apply" button
- Total amount with discount
- "Checkout" button

Write UI test cases. Focus: display, interaction, states.
```

### For an API (Postman)

```text
Here's the API endpoint documentation:

POST /api/orders
Headers: Authorization: Bearer {token}
Body: { "items": [...], "address_id": 123, "payment_method": "card" }
Responses: 201 Created, 400 Bad Request, 401 Unauthorized, 422 Unprocessable

Write test cases for Postman.
For each: method, URL, request body, expected code and response body.
```

## Exploratory testing

When standard scenarios are exhausted — ask Claude to think for you.

```text
I'm testing file upload to cloud storage.
Supported formats: jpg, png, pdf, docx.
Limit: 50 MB per file, 10 files at once.

Suggest 15 unusual ways to break this feature.
The more creative — the better.
```

Claude will suggest:
- File with .jpg extension but exe inside
- File exactly 50 MB, 50.01 MB, 0 bytes
- File name with 255 characters
- File name with spaces, Unicode, emoji
- Upload 10 files and during upload — an 11th
- Upload and immediately delete before completion
- Two identical files at once
- Lose internet mid-upload

Personas — another powerful technique:

```text
I'm testing a clothing online store.
Imagine you are:
1. A visually impaired user (text scaled to 200%)
2. A user on slow 3G
3. A user with keyboard only, no mouse
4. A first-time online shopper

What problems might each encounter?
What test cases are needed for each?
```

## Bug reports

You found a bug. Instead of spending 10 minutes formatting — give Claude a raw description.

```text
Format a bug report for Jira:

Went to profile, clicked "Change avatar", picked a photo from phone,
photo uploaded but shows upside-down. Refresh — old avatar shows.
Console error "EXIF orientation not supported". Chrome 125, macOS.
```

Claude produces:

**Title:** Avatar shows with wrong orientation when uploading photo with EXIF data

**Severity:** Major

**Steps to reproduce:**
1. Log in
2. Navigate to Profile → Settings
3. Click "Change avatar"
4. Select a photo taken on phone (with EXIF orientation)
5. Confirm upload

**Expected:** Avatar shows in correct orientation

**Actual:** Avatar is rotated 180°. After page refresh, old avatar is shown

**Environment:** Chrome 125, macOS Sonoma

**Extra info:** Console error `EXIF orientation not supported`. Likely the server doesn't process EXIF data when saving the image.

Copied — pasted into Jira. Two minutes instead of ten.

## Test data

### Email addresses

```text
Generate 20 email addresses for testing an email field:
- 5 valid (different domains, lengths)
- 5 invalid (typical mistakes)
- 5 edge (max length, special chars)
- 5 for security (XSS, SQL injection)

Format: email | type | what we check
```

### JSON for API

```text
Generate 5 request bodies for POST /api/users:
{ "name": "", "email": "", "age": 0, "role": "" }

1. Valid request
2. Empty required fields
3. Age = -1, 0, 150, 999
4. Email with SQL injection
5. Name 1000 chars long

Format: JSON + what we check.
```

### SQL for test DB

```text
Write SQL to create test data:
- 10 users (different roles: admin, user, moderator)
- 50 products (different categories, prices from 0.01 to 999999.99)
- 20 orders (different statuses: new, paid, shipped, delivered, cancelled)

DB: PostgreSQL. Tables: users, products, orders.
```

### CSV for import

```text
Create a CSV file with 15 rows for testing user import.
Columns: name, email, phone, role, status.

Include:
- 5 correct rows
- 2 with empty required fields
- 2 with duplicate emails
- 2 with invalid phone format
- 2 with non-existent role
- 2 with special chars in name
```

## Working with errors and logs

### What does this error mean?

```text
While testing I got this error:

HTTP 502 Bad Gateway
nginx/1.24.0

What does this mean? Where's the problem? What do I write in the bug report?
```

Claude explains: 502 — the intermediary (nginx) couldn't get a response from backend. The problem isn't on the client side, it's the server. For the bug report: "Backend not responding, nginx returns 502".

### Stack trace

```text
Explain this error in plain English, as if to a QA engineer:

System.NullReferenceException: Object reference not set to an instance of an object.
   at OrderService.CalculateTotal(Order order) in OrderService.cs:line 47
   at OrderController.Checkout(CheckoutRequest request) in OrderController.cs:line 123
   at Microsoft.AspNetCore.Mvc.Infrastructure.ActionMethodExecutor.Execute()
```

Claude says: "When placing an order (Checkout) the system tries to compute the total (CalculateTotal), but the order object is empty (null). Line 47 in OrderService.cs. Likely the order wasn't created before the payment attempt."

Now you can write a bug report with precise details: "NullReferenceException in OrderService.cs:47 on empty order".

### Flaky bug

```text
I have a bug that reproduces in roughly 1 in 5 attempts:
- Add item to cart
- Go to checkout
- Sometimes total shows 0

What could cause this? How do I reliably reproduce it?
What info should I collect for the developer?
```

Claude suggests: race condition, caching, an async request that doesn't complete in time, session issues. It'll prompt you: try rapid navigation, open two tabs, check the Network tab in DevTools.

> Next part — ready-to-use prompt templates, release prep, and reporting for managers.
