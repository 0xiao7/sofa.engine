import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);

test('podcast release checker verifies every manifest episode including EP007', () => {
  const output = execFileSync('node', ['scripts/check-podcast-release.mjs'], {
    cwd: root.pathname,
    encoding: 'utf8',
  });

  assert.match(output, /Podcast release OK: 7 episodes/);
  assert.match(output, /EP007/);
});
