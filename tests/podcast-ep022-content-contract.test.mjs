import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const episode = JSON.parse(readFileSync(new URL('data/podcast-productions/ep022.json', root), 'utf8'));

test('EP022 is a current-law Bookkeeper reading that preserves the full Article 21 source', () => {
  assert.deepEqual(
    { episodeId: episode.episodeId, exam: episode.exam, law: episode.law, article: episode.article, format: episode.format },
    { episodeId: 'EP022', exam: '記帳士', law: '稅捐稽徵法', article: '21', format: '法條精讀' },
  );
  assert.equal(createHash('sha256').update(episode.officialOriginalText).digest('hex'), episode.sourceOriginalTextSha256);
  assert.match(episode.officialLawUrl, /^https:\/\/law\.moj\.gov\.tw\//);
  assert.match(episode.officialOriginalText, /核課期間為五年/);
  assert.match(episode.officialOriginalText, /核課期間為七年/);
  assert.match(episode.officialOriginalText, /其時效不完成/);
  const spoken = episode.segments.filter((segment) => segment.text).map((segment) => segment.text).join('\n');
  assert.equal(episode.transcriptText, spoken);
  assert.ok(episode.segments.some((segment) => segment.cue === true));
  assert.ok(episode.segments.some((segment) => segment.silence === true && segment.seconds === 6));
  assert.doesNotMatch(spoken, /視頻|信息|質量|賬號|會ㄏㄨㄟˋ計/);
});
