# sharepreview

Preview Open Graph share cards from a **localhost URL** — the way they look when shared on X/Twitter, LinkedIn, or Slack.

Built for developers and AI agents working on static sites, blogs, and apps with local preview servers.

## Install

```bash
git clone <your-remote>/sharepreview.git
cd sharepreview
npm link
```

Or run directly:

```bash
node bin/sharepreview.mjs http://127.0.0.1:4000/my-post/
```

Requires **Node 18+**. Zero runtime dependencies.

## Usage

```bash
# Start your site preview first (Jekyll, Astro, etc.)
bundle exec jekyll serve --port 4000

# Launch share preview on a separate port (default :4711)
sharepreview http://127.0.0.1:4000/my-post/

# Agent-friendly JSON output
sharepreview http://127.0.0.1:4000/my-post/ --json

# Fail when required OG tags are missing
sharepreview http://127.0.0.1:4000/my-post/ --validate

# Open the preview in your browser
sharepreview http://127.0.0.1:4000/my-post/ --open

# Save a PNG of the preview page (requires puppeteer)
npm install puppeteer
sharepreview http://127.0.0.1:4000/my-post/ --screenshot my-post-share.png
```

The CLI fetches your page, extracts `og:*` and `twitter:*` meta tags, checks `og:image` dimensions, then serves a share-card mock UI on `http://127.0.0.1:4711/` (or the next free port).

The preview page includes:

- X/Twitter, LinkedIn, Facebook, Slack, Discord, and iMessage mocks
- Light/dark mode toggle
- Validation banner for missing tags or image warnings
- **Copy preview link** — copies the `http://127.0.0.1:4711/...` URL to your clipboard (handy to re-open, paste in notes, or share if you tunnel localhost)
- Collapsible extracted metadata JSON

Press **Ctrl+C** to stop the preview server.

Run tests:

```bash
npm test
```

## Agent skills

Install the bundled skill for your agent:

```bash
sharepreview install-skill --target grok
sharepreview install-skill --target cursor
sharepreview install-skill --target claude
```

The skill lives at `skills/sharepreview/SKILL.md` and documents the preview workflow for agents.

## JSON output

```json
{
  "source_url": "http://127.0.0.1:4000/my-post/",
  "preview_url": "http://127.0.0.1:4711/",
  "preview_port": 4711,
  "valid": true,
  "missing": [],
  "og": {
    "title": "My post",
    "description": "…",
    "image": "http://127.0.0.1:4000/images/og/my-post.png",
    "url": "http://127.0.0.1:4000/my-post/",
    "type": "article",
    "site_name": "My Site"
  },
  "twitter": {
    "card": "summary_large_image",
    "title": "My post",
    "description": "…",
    "image": "http://127.0.0.1:4000/images/og/my-post.png"
  },
  "warnings": []
}
```

## How it differs from other tools

| Tool | What you get |
|------|----------------|
| Opening `images/og/foo.png` | Raw card image only |
| `ogpk` / `og-check` | Terminal meta dump + inline image |
| Facebook/Twitter debuggers | Requires a public URL |
| **sharepreview** | Full share-card mock from localhost + agent JSON |

## License

MIT