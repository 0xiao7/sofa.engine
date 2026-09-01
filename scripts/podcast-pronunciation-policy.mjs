import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const POLICY_URL = new URL('../data/podcast-pronunciation-policy-v1.json', import.meta.url);
const POLICY_BYTES = readFileSync(POLICY_URL);

export const PODCAST_PRONUNCIATION_POLICY = Object.freeze(JSON.parse(POLICY_BYTES));
export const PODCAST_PRONUNCIATION_POLICY_SHA256 = createHash('sha256')
  .update(POLICY_BYTES)
  .digest('hex');
