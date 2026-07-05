import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_LINKS } from './site-links.mjs';
import { safeFetch, LIMITS } from './safe-fetch.mjs';
import { assertLocalhostUrl } from './url-policy.mjs';
import { escapeHtml } from './escape-html.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'templates', 'preview.html');
const PACKAGE_PATH = path.join(ROOT, 'package.json');

const FOOTER = {
  version: JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8')).version,
  ...SITE_LINKS,
};

function readTemplate() {
  return fs.readFileSync(TEMPLATE_PATH, 'utf8');
}

function renderPreviewPage(payload) {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return readTemplate()
    .replace('<!--SOURCE_URL-->', escapeHtml(payload.source_url))
    .replace('<!--PAYLOAD_JSON-->', json)
    .replaceAll('__VERSION__', FOOTER.version)
    .replaceAll('<!--GITHUB_URL-->', FOOTER.github)
    .replaceAll('<!--AUTHOR_URL-->', FOOTER.author)
    .replaceAll('<!--COFFEE_URL-->', FOOTER.coffee);
}

async function readJsonBody(req, maxBytes = 4096) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new Error('Request body too large');
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Invalid JSON body');
  }
}

async function proxyImage(targetUrl, res) {
  assertLocalhostUrl(targetUrl, 'Proxy URL');

  const { buffer, contentType } = await safeFetch(targetUrl, {
    maxBytes: LIMITS.imageMaxBytes,
    timeoutMs: LIMITS.timeoutMs,
    label: 'Proxy URL',
  });

  res.writeHead(200, {
    'Content-Type': contentType || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  res.end(buffer);
}

function proxyErrorStatus(error) {
  if (error.message.includes('must be a localhost URL')) return 403;
  if (error.message.includes('Timed out')) return 504;
  if (error.message.includes('byte limit')) return 413;
  return 502;
}

function requestErrorStatus(error) {
  if (error.message.includes('must be a localhost URL')) return 403;
  if (error.message.includes('Invalid URL') || error.message.includes('Invalid JSON')) return 400;
  if (error.message.includes('not enabled')) return 405;
  return 502;
}

export function findOpenPort(preferred = 4711) {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(findOpenPort(preferred + 1));
        return;
      }
      reject(error);
    });
    server.listen(preferred, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

export async function startPreviewServer({
  initialPayload,
  loadPayload = null,
  port = 4711,
  host = '127.0.0.1',
} = {}) {
  const resolvedPort = await findOpenPort(port);
  let currentSourceUrl = initialPayload.source_url;
  let currentPayload = initialPayload;
  let loadPromise = null;

  async function loadFromSource(url) {
    if (!loadPayload) {
      throw new Error('Live reload is not enabled for this preview server');
    }

    if (!loadPromise) {
      loadPromise = loadPayload(url)
        .then((next) => {
          currentSourceUrl = url;
          currentPayload = next;
          return next;
        })
        .finally(() => {
          loadPromise = null;
        });
    }

    return loadPromise;
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${host}:${resolvedPort}`);

    if (url.pathname === '/source' && req.method === 'POST') {
      if (!loadPayload) {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Live reload is not enabled');
        return;
      }

      try {
        const body = await readJsonBody(req);
        if (!body.url) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing url in JSON body');
          return;
        }

        const nextSourceUrl = new URL(body.url).href;
        assertLocalhostUrl(nextSourceUrl, 'Source URL');

        const next = await loadFromSource(nextSourceUrl);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(next, null, 2));
      } catch (error) {
        res.writeHead(requestErrorStatus(error), { 'Content-Type': 'text/plain' });
        res.end(error.message);
      }
      return;
    }

    if (url.pathname === '/refresh' && req.method === 'POST') {
      if (!loadPayload) {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Live reload is not enabled');
        return;
      }

      try {
        const next = await loadFromSource(currentSourceUrl);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(next, null, 2));
      } catch (error) {
        res.writeHead(requestErrorStatus(error), { 'Content-Type': 'text/plain' });
        res.end(error.message);
      }
      return;
    }

    if (url.pathname === '/proxy') {
      const target = url.searchParams.get('url');
      if (!target) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing url query parameter');
        return;
      }
      try {
        await proxyImage(target, res);
      } catch (error) {
        res.writeHead(proxyErrorStatus(error), { 'Content-Type': 'text/plain' });
        res.end(error.message);
      }
      return;
    }

    if (url.pathname === '/meta.json') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(currentPayload, null, 2));
      return;
    }

    if (url.pathname === '/' || url.pathname === '') {
      if (loadPayload) {
        try {
          await loadFromSource(currentSourceUrl);
        } catch (error) {
          res.writeHead(requestErrorStatus(error), { 'Content-Type': 'text/plain' });
          res.end(error.message);
          return;
        }
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(renderPreviewPage(currentPayload));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  await new Promise((resolve) => server.listen(resolvedPort, host, resolve));

  return {
    host,
    port: resolvedPort,
    preview_url: `http://${host}:${resolvedPort}/`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
  };
}