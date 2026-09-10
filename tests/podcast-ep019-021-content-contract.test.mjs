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
  EP019: { law: '所得稅法', article: '04', format: '法條精讀' },
  EP020: { law: '稅捐稽徵法', article: '02', format: '情境背誦' },
  EP021: { law: '稅捐稽徵法', article: '06', format: '題目帶思路' },
};

test('EP019-EP021 are a source-locked three-lane Bookkeeper batch with full transcripts', () => {
  for (const [episodeId, contract] of Object.entries(expected)) {
    const episode = readJson(`data/podcast-productions/${episodeId.toLowerCase()}.json`);
    assert.equal(episode.episodeId, episodeId);
    assert.equal(episode.exam, '記帳士');
    assert.equal(episode.law, contract.law);
    assert.equal(episode.article, contract.article);
    assert.equal(episode.format, contract.format);
    assert.equal(episode.voicePolicyId, 'podcast-ep001-master-v1');
    assert.match(episode.officialLawUrl, /^https:\/\/law\.moj\.gov\.tw\//);
    assert.equal(sha256(episode.officialOriginalText), episode.sourceOriginalTextSha256);
    assert.ok(episode.segments.some((segment) => segment.cue === true));
    assert.ok(episode.segments.some((segment) => segment.silence === true && segment.seconds === 6));
    const spoken = episode.segments.filter((segment) => segment.text).map((segment) => segment.text).join('\n');
    assert.equal(episode.transcriptText, spoken);
    assert.match(spoken, /記帳士國考/);
    assert.doesNotMatch(spoken, /視頻|信息|質量|賬號|會ㄏㄨㄟˋ計/);
  }
});

test('EP020 clearly labels its invented scenario and never presents it as an official question', () => {
  const episode = readJson('data/podcast-productions/ep020.json');
  assert.match(episode.transcriptText, /依現行條文設計的記憶情境，不是考選部原題/);
  assert.match(episode.transcriptText, /但不包括關稅/);
  assert.doesNotMatch(episode.transcriptText, /官方原題|歷屆試題/);
});

test('EP021 is locked to official 105 Bookkeeper tax-law Q3 and answer C', () => {
  const evidence = readJson('data/podcast-question-evidence/ep021-105-q3.json');
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
      questionNo: 3,
      officialAnswer: 'C',
      verifiedAnswer: 'C',
    },
  );
  assert.equal(evidence.answerConflict, false);
  assert.match(evidence.sourceUrl, /^https:\/\/wwwq\.moex\.gov\.tw\//);
  assert.match(evidence.officialAnswerUrl, /^https:\/\/wwwq\.moex\.gov\.tw\//);
  assert.equal(evidence.law, '稅捐稽徵法');
  assert.equal(evidence.article, '6');
  assert.equal(evidence.verifyStatus, 'done');
  assert.equal(evidence.reviewStatus, 'first_review_passed');
  assert.equal(evidence.backReviewStatus, 'rechecked');

  const episode = readJson('data/podcast-productions/ep021.json');
  assert.equal(episode.questionEvidence, 'data/podcast-question-evidence/ep021-105-q3.json');
  assert.match(episode.transcriptText, /一百零五年記帳士考試/);
  assert.match(episode.transcriptText, /答案是 C/);
  assert.match(episode.transcriptText, /A 房屋的地價稅、拍賣產生的土地增值稅與營業稅/);
});
