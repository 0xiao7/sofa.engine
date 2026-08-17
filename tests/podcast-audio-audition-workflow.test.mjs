import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflowPath = new URL('../.github/workflows/podcast-audio-audition.yml', import.meta.url);

test('podcast audition workflow is manual, private, and artifact-only', () => {
  const workflow = readFileSync(workflowPath, 'utf8');
  assert.match(workflow, /^on:\n  workflow_dispatch:\n/m);
  assert.doesNotMatch(workflow, /\n  (push|pull_request|schedule|release):/);
  assert.match(workflow, /episode:\n\s+description:/);
  assert.match(workflow, /script:\n\s+description:/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /GOOGLE_TTS_SERVICE_ACCOUNT_JSON: \$\{\{ secrets\.GOOGLE_TTS_SERVICE_ACCOUNT_JSON \}\}/);
  assert.match(workflow, /node --test tests\/podcast-voice-policy\.test\.mjs tests\/google-tts-client\.test\.mjs tests\/podcast-audio-master\.test\.mjs tests\/podcast-audition\.test\.mjs/);
  assert.match(workflow, /node scripts\/build-podcast-audition\.mjs/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /path: build\/podcast-audition-/);
  assert.match(workflow, /retention-days: 7/);
  assert.doesNotMatch(workflow, /git push|gh release|youtube|deploy/i);
});
