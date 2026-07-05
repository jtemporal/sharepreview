import { assertLocalhostUrl } from './url-policy.mjs';

export const LIMITS = {
  timeoutMs: 10_000,
  htmlMaxBytes: 5 * 1024 * 1024,
  imageMaxBytes: 20 * 1024 * 1024,
  maxRedirects: 5,
};

async function readBodyWithLimit(response, maxBytes) {
  if (!response.body) {
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) {
      throw new Error(`Response exceeded ${maxBytes} byte limit`);
    }
    return Buffer.from(arrayBuffer);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(`Response exceeded ${maxBytes} byte limit`);
    }

    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks);
}

export async function safeFetch(url, {
  timeoutMs = LIMITS.timeoutMs,
  maxBytes = LIMITS.htmlMaxBytes,
  maxRedirects = LIMITS.maxRedirects,
  headers = {},
  label = 'URL',
} = {}) {
  assertLocalhostUrl(url, label);

  let current = url;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(current, {
        headers,
        redirect: 'manual',
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`Redirect missing Location header from ${current}`);
        }

        const next = new URL(location, current).href;
        assertLocalhostUrl(next, label);
        current = next;
        continue;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch ${current}: HTTP ${response.status}`);
      }

      const buffer = await readBodyWithLimit(response, maxBytes);
      const contentType = response.headers.get('content-type') || '';

      return { buffer, contentType, url: current };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Timed out after ${timeoutMs}ms fetching ${current}`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(`Too many redirects while fetching ${url}`);
}