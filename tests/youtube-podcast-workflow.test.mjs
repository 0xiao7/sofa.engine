import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/youtube-podcast-release.yml', import.meta.url), 'utf8');

test('workflow installs FFmpeg before media-contract tests', () => {
  const install = workflow.indexOf('apt-get install --yes ffmpeg');
  const verify = workflow.indexOf('node --test tests/youtube-podcast-*.test.mjs');
  assert.ok(install >= 0, 'FFmpeg install step is required');
  assert.ok(install < verify, 'FFmpeg must be installed before media-contract tests');
});

test('scheduled YouTube Podcast workflow validates only', () => {
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /cron:\s*['"]20 13 \* \* \*['"]/);
  const scheduled = workflow.match(/if:\s*github\.event_name == 'schedule'[\s\S]*?run:\s*([^\n]+)/)?.[1] || '';
  assert.match(scheduled, /--mode validate/);
  assert.doesNotMatch(scheduled, /upload_private|--mode publish/);
});

test('manual mutation is episode-scoped and receives secrets without echoing them', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /mode:[\s\S]*upload_private[\s\S]*publish/);
  assert.match(workflow, /episode:/);
  assert.match(workflow, /YOUTUBE_CLIENT_ID:\s*\$\{\{ secrets\.YOUTUBE_CLIENT_ID \}\}/);
  assert.match(workflow, /YOUTUBE_CLIENT_SECRET:\s*\$\{\{ secrets\.YOUTUBE_CLIENT_SECRET \}\}/);
  assert.match(workflow, /YOUTUBE_REFRESH_TOKEN:\s*\$\{\{ secrets\.YOUTUBE_REFRESH_TOKEN \}\}/);
  assert.match(workflow, /--episode "\$\{\{ inputs\.episode \}\}"/);
  assert.doesNotMatch(workflow, /echo.*YOUTUBE_|printenv|env\s*$/m);
});

test('workflow uses one lane and commits only the provider ledger', () => {
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*write/);
  assert.match(workflow, /group:\s*youtube-podcast-release/);
  assert.match(workflow, /git add data\/youtube-podcast-ledger\.json/);
  assert.doesNotMatch(workflow, /git add \./);
});
