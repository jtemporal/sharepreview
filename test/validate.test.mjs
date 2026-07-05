import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePreview } from '../src/validate.mjs';

test('validatePreview passes when required fields exist', () => {
  const result = validatePreview({
    og: {
      title: 'Title',
      image: 'http://localhost/image.png',
      url: 'http://localhost/post/',
    },
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.missing, []);
});

test('validatePreview reports missing og fields', () => {
  const result = validatePreview({ og: { title: 'Only title' } });
  assert.equal(result.valid, false);
  assert.deepEqual(result.missing, ['og:image', 'og:url']);
});