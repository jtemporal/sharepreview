export function readImageDimensions(buffer, contentType = '') {
  if (!buffer || buffer.length < 24) return null;

  const type = contentType.toLowerCase();

  if (buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
      format: 'png',
    };
  }

  if (type.includes('jpeg') || type.includes('jpg') || (buffer[0] === 0xff && buffer[1] === 0xd8)) {
    return readJpegDimensions(buffer);
  }

  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return readWebpDimensions(buffer);
  }

  return null;
}

function readJpegDimensions(buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
        format: 'jpeg',
      };
    }
    const length = buffer.readUInt16BE(offset + 2);
    offset += 2 + length;
  }
  return null;
}

function readWebpDimensions(buffer) {
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
      format: 'webp',
    };
  }
  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
      format: 'webp',
    };
  }
  if (chunk === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24) + (buffer[27] << 16),
      height: 1 + buffer.readUIntLE(27) + (buffer[30] << 16),
      format: 'webp',
    };
  }
  return null;
}

export async function fetchImageInfo(imageUrl) {
  if (!imageUrl) return null;

  const response = await fetch(imageUrl, { redirect: 'follow' });
  if (!response.ok) {
    return { error: `HTTP ${response.status}` };
  }

  const contentType = response.headers.get('content-type') || '';
  const buffer = Buffer.from(await response.arrayBuffer());
  const dimensions = readImageDimensions(buffer, contentType);

  if (!dimensions) {
    return { error: 'Could not read image dimensions' };
  }

  const ratio = dimensions.width / dimensions.height;
  const ideal = 1.91;
  const warnings = [];

  if (Math.abs(ratio - ideal) > 0.08) {
    warnings.push(`Aspect ratio ${ratio.toFixed(2)}:1 — recommended ~1.91:1 (1200×630).`);
  }
  if (dimensions.width < 600 || dimensions.height < 315) {
    warnings.push('Image may be too small for crisp large-image cards.');
  }

  return {
    ...dimensions,
    bytes: buffer.length,
    warnings,
  };
}