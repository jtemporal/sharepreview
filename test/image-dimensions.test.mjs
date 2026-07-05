import test from 'node:test';
import assert from 'node:assert/strict';
import { readImageDimensions } from '../src/image-dimensions.mjs';

test('readImageDimensions reads PNG header', () => {
  const buffer = Buffer.alloc(24);
  buffer.write('PNG', 1, 3, 'ascii');
  buffer[0] = 0x89;
  buffer.writeUInt32BE(1200, 16);
  buffer.writeUInt32BE(630, 20);

  const result = readImageDimensions(buffer, 'image/png');
  assert.deepEqual(result, { width: 1200, height: 630, format: 'png' });
});