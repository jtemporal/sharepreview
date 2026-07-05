const META_ATTR_RE = /<meta\s+([^>]*?)\/?>/gi;
const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const CANONICAL_RE = /<link[^>]+rel=["']canonical["'][^>]*>/i;

function readAttr(tag, name) {
  const quoted = tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
  if (quoted) return quoted[1].trim();
  const bare = tag.match(new RegExp(`${name}=([^\\s>]+)`, 'i'));
  return bare ? bare[1].trim() : '';
}

function decodeHtml(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function bucketKey(property, name) {
  if (property) {
    const [ns, key] = property.includes(':') ? property.split(':', 2) : ['', property];
    return { ns: ns || 'meta', key: key || property, value: property };
  }
  if (name) {
    if (name.includes(':')) {
      const [ns, key] = name.split(':', 2);
      return { ns, key, value: name };
    }
    return { ns: 'name', key: name, value: name };
  }
  return null;
}

export function parseHtmlMeta(html) {
  const groups = {
    og: {},
    twitter: {},
    article: {},
    meta: {},
    name: {},
  };

  let match;
  while ((match = META_ATTR_RE.exec(html)) !== null) {
    const tag = match[1];
    const property = readAttr(tag, 'property');
    const name = readAttr(tag, 'name');
    const content = readAttr(tag, 'content');
    if (!content) continue;

    const bucket = bucketKey(property, name);
    if (!bucket) continue;

    const target = groups[bucket.ns] ?? groups.meta;
    target[bucket.key] = content;
  }

  const titleMatch = html.match(TITLE_RE);
  const title = titleMatch ? decodeHtml(titleMatch[1]) : '';

  const canonicalTag = html.match(CANONICAL_RE)?.[0] ?? '';
  const canonical = readAttr(canonicalTag, 'href');

  return { groups, title, canonical };
}

export function resolveUrl(value, baseUrl) {
  if (!value) return '';
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return value;
  }
}

export function buildPreviewData(sourceUrl, html) {
  const { groups, title, canonical } = parseHtmlMeta(html);
  const og = { ...groups.og };
  const twitter = { ...groups.twitter };

  og.title ||= twitter.title || title;
  og.description ||= twitter.description || groups.meta.description || groups.name.description || '';
  og.image ||= twitter.image || twitter['image:src'] || '';
  og.url ||= canonical || sourceUrl;
  og.type ||= 'website';
  og.site_name ||= groups.og.site_name || '';

  twitter.card ||= og.image ? 'summary_large_image' : 'summary';
  twitter.title ||= og.title;
  twitter.description ||= og.description;
  twitter.image ||= og.image;

  const resolved = {
    title: og.title,
    description: og.description,
    image: resolveUrl(og.image, sourceUrl),
    url: resolveUrl(og.url, sourceUrl),
    type: og.type,
    site_name: og.site_name,
  };

  const warnings = [];
  if (!og.image) warnings.push('Missing og:image — share cards will look empty.');
  if (!og.description) warnings.push('Missing og:description — platforms may fall back to page text.');
  if (og.image && !og.image.startsWith('http') && !resolveUrl(og.image, sourceUrl)) {
    warnings.push('Could not resolve og:image against the source URL.');
  }

  return {
    source_url: sourceUrl,
    og: resolved,
    twitter: {
      card: twitter.card,
      title: twitter.title,
      description: twitter.description,
      image: resolveUrl(twitter.image, sourceUrl),
    },
    warnings,
    raw: groups,
  };
}

export async function fetchPageMeta(sourceUrl) {
  const response = await fetch(sourceUrl, {
    headers: { 'User-Agent': 'sharepreview/0.1 (+https://github.com/jtemporal/sharepreview)' },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${sourceUrl}: HTTP ${response.status}`);
  }

  const html = await response.text();
  return buildPreviewData(sourceUrl, html);
}