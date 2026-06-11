---
layout: post
title: "How to launch a site on GitHub Pages in 5 minutes"
categories: devops
date: 2025-02-28
read_time: 5
difficulty: beginner
description: "GitHub Pages — free hosting straight from a repository. Step by step from zero to a working site with a custom domain and HTTPS."
excerpt_text: "Free hosting straight from a repository — step by step from zero to a working site"
keywords: "github pages, hosting, free hosting, static site, deploy"
translation_of: "/devops/github-pages/"
tldr:
  - "A repository named username.github.io plus an index.html in the root = a free site; enable it in Settings → Pages → Deploy from a branch, deploy takes 1-2 minutes."
  - "Custom domain: enter it in the Custom domain field and add a DNS CNAME record pointing to username.github.io; HTTPS turns on automatically via Let's Encrypt."
  - "Static files only (HTML/CSS/JS), no server-side logic; limits: repo and site up to 1 GB, 100 MB per file, about 100 GB of traffic per month."
  - "Getting a 404 — check the file is named index.html in lowercase and sits in the root; site not updating — wrong branch pushed or the CDN is caching."
faq:
  - q: "Can I use React/Vue/Angular?"
    a: "Yes. Build the app (npm run build), commit the contents of dist/ to a gh-pages branch or main. For production builds set up GitHub Actions with upload-pages-artifact + deploy-pages — automatic deploy on push."
  - q: "Are there size limits?"
    a: "Repo up to 1GB, site up to 1GB, a soft limit of 100GB of traffic per month. Files up to 100MB each. For a blog, documentation or a landing page that is overkill. If you do hit the limits — consider Vercel or Cloudflare Pages."
  - q: "Does GitHub Pages support a backend?"
    a: "No, static files only (HTML/CSS/JS). If you need a backend — GitHub Pages frontend plus a separate API (Cloudflare Workers, AWS Lambda, Vercel Functions). Or use Jekyll/Hugo for SSG."
  - q: "Can I hide the site from indexing?"
    a: "Put a robots.txt with Disallow: / in the root. But Pages cannot be made private — public repos always mean public sites. For private sites you need GitHub Enterprise or different hosting."
---

## What is GitHub Pages

GitHub Pages takes the files from your repository and serves them as a static site. Works with HTML, CSS, JavaScript. Free, the default domain is `username.github.io`.

Perfect for: portfolios, documentation, blogs, landing pages.

## Step 1 — Create a repository

The repository name must be exactly `username.github.io`, where `username` is your GitHub login.

> 💡 For a project (not a personal site) the name can be anything — it'll be served at `username.github.io/repo-name`.

## Step 2 — Add index.html

GitHub Pages looks for the entry point — an `index.html` file at the root of the repository. Here's the minimum file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My site</title>
</head>
<body>
  <h1>Hello, world!</h1>
</body>
</html>
```

## Step 3 — Enable Pages in settings

1. Open the repository's **Settings**
2. In the left sidebar find **Pages**
3. Source: **Deploy from branch**
4. Pick the branch — `main` or `master`, folder — `/ (root)`
5. Click **Save**

GitHub will start the deploy — usually 1-2 minutes.

## Step 4 — Open your site

After the deploy finishes, the address shows up in the Pages section: `https://username.github.io`.

## Custom domain

To hook up your own domain:

1. In the Pages settings enter the domain in the **Custom domain** field
2. At your registrar add a DNS record: `CNAME @ username.github.io`
3. Wait for DNS to propagate — anywhere from 5 minutes to a few hours

> ✅ HTTPS turns on automatically via Let's Encrypt — nothing to configure.

## Common issues

**Site doesn't update after push** — check that you're pushing to the branch you set in settings. If it's correct — wait a few minutes, the CDN caches.

**404 page** — make sure the file is named exactly `index.html` (lowercase) and lives at the root, not in a subfolder.

> ⚠️ GitHub Pages doesn't support server-side logic (Node.js, PHP, Python). Static only: HTML, CSS, JS.
