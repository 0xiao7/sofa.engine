import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const active = html.replace(/<!--[\s\S]*?-->/g, '');

test('dashboard exposes a seed-backed cockpit recap', () => {
  assert.match(active, /id="study-cockpit-recap"/);
  assert.match(active, /id="study-cockpit-subjects"/);
  assert.match(active, /id="study-cockpit-blocks"/);
});

test('dashboard fetches the authenticated study today endpoint', () => {
  assert.match(active, /\/api\/me\/study\/today\?track=bookkeeper/);
});

test('dashboard renders subject containers and seeded blocks', () => {
  assert.match(active, /function renderStudyToday/);
  assert.match(active, /implementation_status/);
  assert.match(active, /deferred_subject_container_only/);
  assert.match(active, /seeded_moex_mcq/);
  assert.match(active, /law_to_subject_mapping/);
});

test('study today empty weak bridge avoids fake zero metrics', () => {
  const start = active.indexOf('function renderStudyToday');
  assert.ok(start >= 0, 'renderStudyToday function must exist');
  const fn = active.slice(start, start + 2600);
  assert.match(fn, /weak_law_bridge/);
  assert.doesNotMatch(fn, /0 條弱點|目前有 0/);
});
