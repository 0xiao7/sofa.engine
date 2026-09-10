#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizePublicLegalCitation } from './render-podcast-release.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function rewriteJson(path, fields) {
  const payload = JSON.parse(readFileSync(path, 'utf8'));
  for (const episode of payload.episodes || []) {
    for (const field of fields) {
      if (typeof episode[field] === 'string') {
        episode[field] = normalizePublicLegalCitation(episode[field]);
      }
    }
  }
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`);
}

rewriteJson(join(root, 'podcast-release.json'), ['title', 'summary', 'transcriptText']);
rewriteJson(join(root, 'data', 'podcast-law-queue.json'), ['title', 'summary']);

for (const filename of [
  'podcast.html',
  'podcast.xml',
  'podcast/ep001-tax-collection-act-article-1-1.html',
]) {
  const path = join(root, filename);
  writeFileSync(path, normalizePublicLegalCitation(readFileSync(path, 'utf8')));
}
