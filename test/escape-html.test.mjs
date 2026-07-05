import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../src/escape-html.mjs';

test('escapeHtml neutralizes HTML metacharacters', () => {
  assert.equal(
    escapeHtml('http://x/--><script>alert(1)</script>'),
    'http://x/--&gt;&lt;script&gt;alert(1)&lt;/script&gt;',
  );
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
});