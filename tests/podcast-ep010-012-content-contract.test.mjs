import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, root), 'utf8'));
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

const expected = {
  EP010: { article: '03', format: '法條精讀' },
  EP011: { article: '04', format: '情境背誦' },
  EP012: { article: '07', format: '題目帶思路' },
};

test('EP010-EP012 implement the approved three-lane Bookkeeper format with complete transcripts', () => {
  for (const [episodeId, contract] of Object.entries(expected)) {
    const episode = readJson(`data/podcast-productions/${episodeId.toLowerCase()}.json`);
    assert.equal(episode.episodeId, episodeId);
    assert.equal(episode.exam, '記帳士');
    assert.equal(episode.law, '加值型及非加值型營業稅法');
    assert.equal(episode.article, contract.article);
    assert.equal(episode.format, contract.format);
    assert.equal(episode.voicePolicyId, 'podcast-ep001-master-v1');
    assert.match(episode.officialLawUrl, /^https:\/\/law\.moj\.gov\.tw\//);
    assert.equal(sha256(episode.officialOriginalText), episode.sourceOriginalTextSha256);
    assert.ok(episode.segments.some(segment => segment.cue === true));
    assert.ok(episode.segments.some(segment => segment.silence === true && segment.seconds === 6));
    const spoken = episode.segments.filter(segment => segment.text).map(segment => segment.text).join('\n');
    assert.equal(episode.transcriptText, spoken);
    assert.doesNotMatch(spoken, /跨境勞務（六款）|中國用語|會ㄏㄨㄟˋ計/);
  }
});

test('EP011 labels its scenario as a memory scenario rather than an official question', () => {
  const episode = readJson('data/podcast-productions/ep011.json');
  const spoken = episode.transcriptText;
  assert.match(spoken, /這是依第四條設計的記憶情境，不是考選部原題/);
  assert.match(spoken, /須移運.*起運地/);
  assert.match(spoken, /無須移運.*所在地/);
  assert.match(spoken, /提供或使用/);
  assert.doesNotMatch(spoken, /歷屆試題|官方原題/);
});

test('EP012 is locked to the real 105 Bookkeeper tax-law Q38 and the official answer', () => {
  const evidence = readJson('data/podcast-question-evidence/ep012-105-q38.json');
  assert.deepEqual(
    {
      rocYear: evidence.rocYear,
      exam: evidence.exam,
      subject: evidence.subject,
      questionNo: evidence.questionNo,
      officialAnswer: evidence.officialAnswer,
      verifiedAnswer: evidence.verifiedAnswer,
    },
    {
      rocYear: 105,
      exam: '記帳士',
      subject: '稅務相關法規概要',
      questionNo: 38,
      officialAnswer: 'A',
      verifiedAnswer: 'A',
    },
  );
  assert.equal(evidence.answerConflict, false);
  assert.match(evidence.sourceUrl, /^https:\/\/wwwq\.moex\.gov\.tw\//);
  assert.match(evidence.officialAnswerUrl, /^https:\/\/wwwq\.moex\.gov\.tw\//);
  assert.equal(evidence.stem, '依加值型及非加值型營業稅法規定，下列何者非屬外銷適用零稅率之範圍？');
  assert.equal(evidence.options.A, '保稅區營業人銷售與課稅區營業人之貨物');
  assert.equal(evidence.options.D, '依法設立之免稅商店銷售與過境或出境旅客之貨物');
  assert.equal(evidence.article, '7');
  assert.equal(evidence.verifyStatus, 'done');
  assert.equal(evidence.reviewStatus, 'first_review_passed');
  assert.equal(evidence.backReviewStatus, 'rechecked');

  const episode = readJson('data/podcast-productions/ep012.json');
  assert.equal(episode.questionEvidence, 'data/podcast-question-evidence/ep012-105-q38.json');
  assert.match(episode.transcriptText, /105 年記帳士考試，稅務相關法規概要第 38 題/);
  assert.match(episode.transcriptText, /答案是 A/);
  assert.match(episode.transcriptText, /第七條明列九款/);
  assert.doesNotMatch(episode.transcriptText, /六款/);
});
