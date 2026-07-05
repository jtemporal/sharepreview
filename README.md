# sharepreview

Preview Open Graph share cards from a **localhost URL** — the way they look when shared on X/Twitter, LinkedIn, or Slack.

Built for developers and AI agents working on static sites, blogs, and apps with local preview servers.

**This is a local development tool.** It is not meant to be hosted publicly, tunneled, or pointed at untrusted URLs. The preview server binds to `127.0.0.1` only and all outbound fetches are restricted to localhost.

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

Use whatever port your dev server runs on (`4000`, `4321`, `5173`, etc.) — sharepreview only checks that the host is localhost.

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
- Collapsible extracted metadata JSON

While the preview server is running:

- **Another page** — paste a new localhost URL in the Source field and click **Load**
- **Same page, updated OG tags** — click **Refresh** (or reload the tab)

No need to stop and restart the CLI. Agents can switch pages with:

```bash
curl -X POST http://127.0.0.1:4711/source \
  -H 'Content-Type: application/json' \
  -d '{"url":"http://127.0.0.1:4000/another-post/"}'
```

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

## Security

sharepreview is hardened for **local-only** use:

| Guard | What it does |
|-------|----------------|
| **Localhost-only fetches** | Source pages, `og:image`, and the image proxy only accept `http://127.0.0.1`, `http://localhost`, or `http://[::1]` |
| **Redirect validation** | Each redirect hop is checked — a public URL cannot redirect you to an internal address |
| **Timeouts** | Fetches abort after 10 seconds |
| **Size limits** | HTML capped at 5 MB; images at 20 MB |
| **Loopback bind** | Preview server listens on `127.0.0.1` only |

Do **not** expose the preview server to the internet (ngrok, Cloudflare Tunnel, `0.0.0.0` bind, etc.). If you ever host a shared version, that would need a separate design with authentication and stricter sandboxing.

`og:image` must resolve to a localhost URL (relative paths are fine — they resolve against your dev server). External CDN images are intentionally not fetched.

## How it differs from other tools

| Tool | What you get |
|------|----------------|
| Opening `images/og/foo.png` | Raw card image only |
| `ogpk` / `og-check` | Terminal meta dump + inline image |
| Facebook/Twitter debuggers | Requires a public URL |
| **sharepreview** | Full share-card mock from localhost + agent JSON |

## Links

- Author: [Jessica Temporal](https://jtemporal.com)
- Repository: [github.com/jtemporal/sharepreview](https://github.com/jtemporal/sharepreview)
- Support: [buymeacoffee.com/jesstemporal](https://buymeacoffee.com/jesstemporal)

## License

MIT