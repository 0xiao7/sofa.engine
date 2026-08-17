import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const qc = JSON.parse(readFileSync(new URL('data/podcast-content-qc-ep002-006.json', root), 'utf8'));

const expected = {
  EP002: { exam: '地政士', law: '土地徵收條例', article: '16' },
  EP003: { exam: '記帳士', law: '商業登記法', article: '10' },
  EP004: { exam: '記帳士', law: '加值型及非加值型營業稅法', article: '39' },
  EP005: { exam: '地政士', law: '土地法', article: '57' },
  EP006: { exam: '記帳士', law: '商業會計法', article: '12' },
};

function digest(text) {
  return createHash('sha256').update(text).digest('hex');
}

test('EP002-EP006 all have official-law QC evidence and correct exam routing', () => {
  assert.deepEqual(qc.episodes.map(row => row.episodeId), Object.keys(expected));
  for (const row of qc.episodes) {
    assert.deepEqual(
      { exam: row.exam, law: row.law, article: row.article },
      expected[row.episodeId],
    );
    assert.match(row.officialLawUrl, /^https:\/\//);
    assert.equal(digest(row.officialOriginalText), row.officialOriginalTextSha256);
    assert.match(row.substantiveReview, /^approved(?:_after_correction)?$/);
  }
});

test('anything introduced as original law text is verbatim official text', () => {
  for (const row of qc.episodes) {
    const episode = JSON.parse(readFileSync(new URL(`data/podcast-productions/${row.episodeId.toLowerCase()}.json`, root), 'utf8'));
    const spoken = episode.segments.filter(segment => segment.text).map(segment => segment.text);
    assert.equal(episode.exam, row.exam);
    assert.equal(episode.law, row.law);
    assert.equal(episode.article, row.article);
    if (row.deliveryMode === 'verbatim') {
      assert.ok(spoken.some(text => text.includes('條文原文')));
      assert.ok(spoken.includes(row.officialOriginalText));
    } else {
      assert.ok(spoken.some(text => text.includes('條文重點')));
      assert.ok(!spoken.some(text => text.includes('條文原文')));
    }
  }
});
