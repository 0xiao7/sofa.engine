import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../login.html', import.meta.url), 'utf8');

test('login keeps serial entry while allowing native iOS reader-safe copy', () => {
  assert.match(html, /id="serial"/);
  assert.match(html, /function isIOSReaderApp/);
  assert.match(html, /applyIOSReaderLoginCopy/);
  assert.match(html, /序號由 SoFa 提供/);
});

test('native iOS login can hide external purchase and LINE trial prompts', () => {
  assert.match(html, /data-ios-reader-hide/);
  assert.match(html, /購買後收到的序號/);
  assert.match(html, /querySelectorAll\('\[data-ios-reader-hide\]'\)/);
  assert.match(html, /el\.style\.display = 'none'/);
});
