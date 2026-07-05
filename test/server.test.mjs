import test from 'node:test';
import assert from 'node:assert/strict';
import { startPreviewServer } from '../src/server.mjs';

const basePayload = {
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

test('preview server serves html and meta.json', async () => {
  const server = await startPreviewServer({ initialPayload: basePayload, port: 4720 });
  try {
    const html = await fetch(server.preview_url).then((res) => res.text());
    const meta = await fetch(`${server.preview_url}meta.json`).then((res) => res.json());

    assert.match(html, /Share Preview/);
    assert.match(html, /id="app-version">0\.1\.0</);
    assert.match(html, /id="source-url"/);
    assert.doesNotMatch(html, /copy-link/);
    assert.equal(meta.og.title, 'Demo');

    const blocked = await fetch(`${server.preview_url}proxy?url=${encodeURIComponent('https://example.com/x.png')}`);
    assert.equal(blocked.status, 403);

    const refresh = await fetch(`${server.preview_url}refresh`, { method: 'POST' });
    assert.equal(refresh.status, 405);

    const source = await fetch(`${server.preview_url}source`, { method: 'POST' });
    assert.equal(source.status, 405);
  } finally {
    await server.close();
  }
});

test('preview server refresh re-fetches current source url', async () => {
  const versions = new Map([
    ['http://127.0.0.1:4000/demo/', 1],
    ['http://127.0.0.1:4000/other/', 1],
  ]);

  const server = await startPreviewServer({
    initialPayload: {
      ...basePayload,
      og: { ...basePayload.og, title: 'V1' },
      twitter: { ...basePayload.twitter, title: 'V1' },
    },
    loadPayload: async (url) => {
      const version = (versions.get(url) ?? 1) + 1;
      versions.set(url, version);
      return {
        source_url: url,
        valid: true,
        missing: [],
        og: {
          title: `V${version}`,
          description: 'Demo',
          image: '',
          url,
          type: 'article',
          site_name: '',
        },
        twitter: { card: 'summary', title: `V${version}`, description: 'Demo', image: '' },
        warnings: [],
      };
    },
    port: 4721,
  });

  try {
    const refreshed = await fetch(`${server.preview_url}refresh`, { method: 'POST' }).then((res) => res.json());
    assert.equal(refreshed.og.title, 'V2');
  } finally {
    await server.close();
  }
});

test('preview server can switch localhost source urls', async () => {
  const server = await startPreviewServer({
    initialPayload: basePayload,
    loadPayload: async (url) => ({
      source_url: url,
      valid: true,
      missing: [],
      og: {
        title: url.includes('/other/') ? 'Other page' : 'Demo',
        description: 'Demo description',
        image: '',
        url,
        type: 'article',
        site_name: '',
      },
      twitter: {
        card: 'summary',
        title: url.includes('/other/') ? 'Other page' : 'Demo',
        description: 'Demo description',
        image: '',
      },
      warnings: [],
    }),
    port: 4722,
  });

  try {
    const switched = await fetch(`${server.preview_url}source`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1:4000/other/' }),
    }).then((res) => res.json());

    assert.equal(switched.og.title, 'Other page');

    const meta = await fetch(`${server.preview_url}meta.json`).then((res) => res.json());
    assert.equal(meta.source_url, 'http://127.0.0.1:4000/other/');

    const blocked = await fetch(`${server.preview_url}source`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/evil/' }),
    });
    assert.equal(blocked.status, 403);
  } finally {
    await server.close();
  }
});