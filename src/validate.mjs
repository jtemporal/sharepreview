const REQUIRED = ['title', 'image', 'url'];

export function validatePreview(data) {
  const missing = REQUIRED.filter((field) => !data.og[field]?.trim());
  return {
    valid: missing.length === 0,
    missing: missing.map((field) => `og:${field}`),
  };
}