import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPreviewData, parseHtmlMeta, resolveUrl } from '../src/meta.mjs';

test('parseHtmlMeta extracts og and twitter tags', () => {
  const html = `<!DOCTYPE html><html><head>
    <meta property="og:title" content="Hello" />
    <meta property="og:image" content="/card.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <title>Fallback</title>
  </head><body></body></html>`;

  const { groups, title } = parseHtmlMeta(html);
  assert.equal(groups.og.title, 'Hello');
  assert.equal(groups.og.image, '/card.png');
  assert.equal(groups.twitter.card, 'summary_large_image');
  assert.equal(title, 'Fallback');
});

test('buildPreviewData resolves relative image urls', () => {
  const data = buildPreviewData('http://127.0.0.1:4000/post/', `<meta property="og:title" content="Hi" />
<meta property="og:image" content="/images/og/hi.png" />`);

  assert.equal(data.og.title, 'Hi');
  assert.equal(data.og.image, 'http://127.0.0.1:4000/images/og/hi.png');
});

test('resolveUrl handles absolute and relative paths', () => {
  assert.equal(resolveUrl('/img.png', 'http://localhost:4000/post/'), 'http://localhost:4000/img.png');
  assert.equal(resolveUrl('https://cdn.test/x.png', 'http://localhost:4000/'), 'https://cdn.test/x.png');
});