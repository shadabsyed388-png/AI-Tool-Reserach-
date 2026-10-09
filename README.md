# Simple SEO Meta Checker

A lightweight Chrome extension (Manifest V3) that instantly inspects the SEO
metadata of whatever page you're on — similar in spirit to the
[Detailed SEO Extension](https://chromewebstore.google.com/detail/detailed-seo-extension/pfjdepjjfjjahkjfpkcgfmfhmnakjfba).

Click the toolbar icon and a popup analyzes the active tab, no data leaves
your browser.

## Features

**Overview**
- Title tag + length check (ideal 30–60 chars)
- Meta description + length check (ideal 70–160 chars)
- Indexability (reads `meta robots`, flags `noindex`)
- Canonical URL
- Quick stats: word count, H1 count, images, images missing `alt`, internal/external links
- Keywords, viewport, language, charset, author
- `hreflang` alternates

**Headings** — full H1–H6 outline with per-level counts, indented by level.

**Social** — Open Graph and Twitter Card tags, with live image previews.

**Links** — every link on the page classified internal / external / nofollow.

**Schema** — JSON-LD structured data (pretty-printed) and microdata `itemtype`s.

## Install (load unpacked)

1. Open `chrome://extensions` in Chrome (or any Chromium browser).
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select this folder.
4. Pin the **Simple SEO Meta Checker** icon and click it on any page.

## How it works

The extension uses the `activeTab` + `scripting` permissions. When you open
the popup it injects a one-off extraction function into the current page,
reads the DOM, and renders the results. It requests no host permissions and
makes no network requests — everything runs locally on the page you're
already viewing.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Manifest V3 definition |
| `popup.html` / `popup.css` | Popup UI |
| `popup.js` | Injects the extractor and renders results |
| `icons/` | Toolbar / store icons |
