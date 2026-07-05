import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT, 'templates', 'preview.html');
const PACKAGE_PATH = path.join(ROOT, 'package.json');

const FOOTER = {
  version: JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8')).version,
  github: 'https://github.com/jtemporal/sharepreview',
  author: 'https://jtemporal.com',
  coffee: 'https://buymeacoffee.com/jesstemporal',
};

function readTemplate() {
  return fs.readFileSync(TEMPLATE_PATH, 'utf8');
}

function renderPreviewPage(payload) {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return readTemplate()
    .replace('<!--SOURCE_URL-->', payload.source_url)
    .replace('<!--PAYLOAD_JSON-->', json)
    .replaceAll('__VERSION__', FOOTER.version)
    .replaceAll('<!--GITHUB_URL-->', FOOTER.github)
    .replaceAll('<!--AUTHOR_URL-->', FOOTER.author)
    .replaceAll('<!--COFFEE_URL-->', FOOTER.coffee);
}

async function proxyImage(targetUrl, res) {
  const response = await fetch(targetUrl, { redirect: 'follow' });
  if (!response.ok) {
    res.writeHead(response.status, { 'Content-Type': 'text/plain' });
    res.end(`Failed to proxy image: HTTP ${response.status}`);
    return;
  }

  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const buffer = Buffer.from(await response.arrayBuffer());
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  res.end(buffer);
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

export async function startPreviewServer(payload, { port = 4711, host = '127.0.0.1' } = {}) {
  const resolvedPort = await findOpenPort(port);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${host}:${resolvedPort}`);

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
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end(`Proxy error: ${error.message}`);
      }
      return;
    }

    if (url.pathname === '/meta.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload, null, 2));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderPreviewPage(payload));
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