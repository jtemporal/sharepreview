import test from 'node:test';
import assert from 'node:assert/strict';
import { startPreviewServer } from '../src/server.mjs';

test('preview server serves html and meta.json', async () => {
  const payload = {
    source_url: 'http://127.0.0.1:4000/demo/',
    valid: true,
    missing: [],
    og: {
      title: 'Demo',
      description: 'Demo description',
      image: '',
      url: 'http://127.0.0.1:4000/demo/',
      type: 'article',
      site_name: 'Demo Site',
    },
    twitter: {
      card: 'summary',
      title: 'Demo',
      description: 'Demo description',
      image: '',
    },
    warnings: [],
  };

  const server = await startPreviewServer(payload, { port: 4720 });
  try {
    const html = await fetch(server.preview_url).then((res) => res.text());
    const meta = await fetch(`${server.preview_url}meta.json`).then((res) => res.json());

    assert.match(html, /Share Preview/);
    assert.match(html, /id="app-version">0\.1\.0</);
    assert.equal(meta.og.title, 'Demo');
  } finally {
    await server.close();
  }
});