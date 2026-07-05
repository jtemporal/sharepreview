import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalhostUrl, isLocalhostUrl } from '../src/url-policy.mjs';

test('isLocalhostUrl accepts loopback hosts', () => {
  assert.equal(isLocalhostUrl('http://127.0.0.1:4000/post/'), true);
  assert.equal(isLocalhostUrl('http://localhost:4000/post/'), true);
  assert.equal(isLocalhostUrl('http://[::1]:4000/post/'), true);
  assert.equal(isLocalhostUrl('http://127.0.0.2:4000/post/'), true);
  assert.equal(isLocalhostUrl('http://127.0.0.1:5173/post/'), true);
  assert.equal(isLocalhostUrl('http://localhost:8080/post/'), true);
});

test('isLocalhostUrl rejects non-loopback hosts', () => {
  assert.equal(isLocalhostUrl('https://example.com/post/'), false);
  assert.equal(isLocalhostUrl('http://169.254.169.254/'), false);
  assert.equal(isLocalhostUrl('http://192.168.1.1/'), false);
  assert.equal(isLocalhostUrl('file:///etc/passwd'), false);
});

test('assertLocalhostUrl throws for external urls', () => {
  assert.throws(
    () => assertLocalhostUrl('https://evil.test/', 'Source URL'),
    /Source URL must be a localhost URL/,
  );
});