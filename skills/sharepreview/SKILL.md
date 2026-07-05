---
name: sharepreview
description: >
  Preview Open Graph share cards from a localhost URL before publishing.
  Use when previewing og:image, social cards, link unfurls, share previews,
  or validating og:title/og:description locally. Triggers on: sharepreview,
  og preview, social preview, link card preview, /sharepreview.
---

# Share Preview

Preview how a page will look when shared on X/Twitter, LinkedIn, or Slack — using a localhost URL from a running dev server.

## When to use

- After `jekyll serve`, `npm run dev`, or any local preview is running
- Before committing a new post with an OG image
- When the author asks to preview social cards or og:image

## Workflow

1. Confirm the site preview is running (e.g. `http://127.0.0.1:4000/<slug>/`).
2. Run sharepreview against that exact URL:

```bash
sharepreview http://127.0.0.1:4000/<slug>/ --json
```

3. Read the JSON output:
   - `valid` must be `true` (or report `missing` tags)
   - Check `image_info` for og:image dimensions (target ~1200×630)
   - Give the author `preview_url` to open in a browser
4. Keep the preview server running until the author approves.
5. Optional: `sharepreview <url> --screenshot share-preview.png` (requires `npm install puppeteer`)
5. Use `--validate` in CI or pre-commit checks:

```bash
sharepreview http://127.0.0.1:4000/<slug>/ --validate
```

## Commands

```bash
# Human-friendly output + preview server on :4711
sharepreview http://127.0.0.1:4000/my-post/

# Agent mode
sharepreview http://127.0.0.1:4000/my-post/ --json

# Open browser automatically
sharepreview http://127.0.0.1:4000/my-post/ --open

# Install this skill for Grok
sharepreview install-skill --target grok
```

## Notes

- Requires Node 18+.
- The preview server runs on a separate port (default `4711`) from the site preview.
- `og:image` is proxied through the preview server so relative image paths work.
- Press Ctrl+C to stop the preview server when done.