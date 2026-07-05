export function isLocalhostHostname(hostname) {
  const host = hostname.toLowerCase();

  if (host === 'localhost' || host === '::1' || host === '[::1]') {
    return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    return Number(ipv4[1]) === 127;
  }

  return false;
}

export function isLocalhostUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  return isLocalhostHostname(parsed.hostname);
}

export function assertLocalhostUrl(urlString, label = 'URL') {
  if (!isLocalhostUrl(urlString)) {
    throw new Error(
      `${label} must be a localhost URL (http://127.0.0.1 or http://localhost). Got: ${urlString}`,
    );
  }
}