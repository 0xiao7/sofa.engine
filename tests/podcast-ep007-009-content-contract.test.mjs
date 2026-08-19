import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const queue = JSON.parse(readFileSync(new URL('data/podcast-law-queue.json', root), 'utf8'));
const overrides = JSON.parse(readFileSync(new URL('data/podcast-law-source-overrides.json', root), 'utf8'));
const qc = JSON.parse(readFileSync(new URL('data/podcast-content-qc-ep007-009.json', root), 'utf8'));

const expected = {
  EP007: { article: '01', url: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=1' },
  EP008: { article: '01之1', url: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=1-1' },
  EP009: { article: '02', url: 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340080&flno=2' },
};

function digest(text) {
  return createHash('sha256').update(text).digest('hex');
}

test('EP007-EP009 use corrected official permalinks and remain unreleased', () => {
  for (const [id, contract] of Object.entries(expected)) {
    const row = queue.episodes.find(episode => episode.id === id);
    assert.equal(row.exam, '記帳士');
    assert.equal(row.law, '加值型及非加值型營業稅法');
    assert.equal(row.article, contract.article);
    assert.equal(row.officialLawUrl, contract.url);
    assert.equal(row.status, 'content_verified_audio_pending');
    assert.equal(row.listenApproval.status, 'pending');
  }
  assert.equal(overrides.overrides.EP008.officialLawUrl, expected.EP008.url);
});

test('EP007-EP009 official text evidence is complete and self-hashing', () => {
  assert.deepEqual(qc.episodes.map(row => row.episodeId), ['EP007', 'EP008', 'EP009']);
  for (const row of qc.episodes) {
    assert.equal(row.officialLawUrl, expected[row.episodeId].url);
    assert.equal(row.deliveryMode, 'verbatim');
    assert.match(row.substantiveReview, /^approved(?:_after_correction)?$/);
    assert.equal(digest(row.officialOriginalText), row.officialOriginalTextSha256);
    assert.doesNotMatch(row.officialOriginalText, /買受 人|不符 免稅/);
  }
  assert.equal(
    qc.episodes.find(row => row.episodeId === 'EP008').officialOriginalText,
    '本法所稱加值型之營業稅，係指依第四章第一節計算稅額者；所稱非加值型之營業稅，係指依第四章第二節計算稅額者。',
  );
});
