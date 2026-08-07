import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/podcast-daily-release.yml', import.meta.url), 'utf8');

test('daily release uses GitHub-hosted cloud schedule and one concurrency lane', () => {
  assert.match(workflow, /cron:\s*['"]0 13 \* \* \*['"]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /runs-on:\s*ubuntu-latest/);
  assert.doesNotMatch(workflow, /self-hosted|macos-latest/);
  assert.match(workflow, /concurrency:/);
  assert.match(workflow, /group:\s*podcast-daily-release/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
});

test('daily release is least-privilege and runs all fail-closed gates before commit', () => {
  assert.match(workflow, /contents:\s*write/);
  assert.doesNotMatch(workflow, /pull-requests:\s*write|actions:\s*write/);
  const queueGate = workflow.indexOf('podcast-daily-queue.test.mjs');
  const releaseGate = workflow.indexOf('check-podcast-release.mjs');
  const commit = workflow.indexOf('git commit');
  assert.ok(queueGate >= 0 && releaseGate > queueGate && commit > releaseGate);
  assert.match(workflow, /git diff --quiet/);
});
