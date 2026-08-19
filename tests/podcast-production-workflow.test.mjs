import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/podcast-production.yml', import.meta.url), 'utf8');

test('production workflow uses paid Azure Speech and only emits approval-gated artifacts', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /SPEECH_KEY: \$\{\{ secrets\.AZURE_SPEECH_KEY \}\}/);
  assert.match(workflow, /SPEECH_REGION: \$\{\{ secrets\.AZURE_SPEECH_REGION \}\}/);
  assert.match(workflow, /build-podcast-production\.mjs/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(workflow, /edge-tts|youtube-podcast-release|release-due-podcast|git push/);
});

test('production workflow reuses runner FFmpeg before attempting package installation', () => {
  assert.match(workflow, /command -v ffmpeg \|\| sudo apt-get install --yes ffmpeg/);
  assert.doesNotMatch(workflow, /apt-get update/);
});
