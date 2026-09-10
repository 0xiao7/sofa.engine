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
  EP026: { article: '2', format: '法條精讀' },
  EP027: { article: '4', format: '情境背誦' },
  EP028: { article: '14', format: '題目帶思路' },
};

test('EP026-EP028 are distinct source-locked Bookkeeper lanes with full transcripts', () => {
  for (const [episodeId, contract] of Object.entries(expected)) {
    const episode = readJson(`data/podcast-productions/${episodeId.toLowerCase()}.json`);
    assert.deepEqual(
      {
        episodeId: episode.episodeId,
        exam: episode.exam,
        law: episode.law,
        article: episode.article,
        format: episode.format,
        voicePolicyId: episode.voicePolicyId,
      },
      {
        episodeId,
        exam: '記帳士',
        law: '商業會計法',
        article: contract.article,
        format: contract.format,
        voicePolicyId: 'podcast-ep001-master-v1',
      },
    );
    assert.equal(episode.officialLawUrl, `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=J0080009&flno=${contract.article}`);
    assert.equal(sha256(episode.officialOriginalText), episode.sourceOriginalTextSha256);
    assert.ok(episode.segments.some((segment) => segment.cue === true));
    assert.ok(episode.segments.some((segment) => segment.silence === true && segment.seconds === 6));
    const spoken = episode.segments.filter((segment) => segment.text).map((segment) => segment.text).join('\n');
    assert.equal(episode.transcriptText, spoken);
    assert.match(spoken, /記帳士國考/);
    assert.match(spoken, /SoFa 官網/);
    assert.doesNotMatch(spoken, /視頻|信息|質量|賬號|打印|會ㄏㄨㄟˋ計/);
  }
});

test('EP026 preserves the two definitions and exactly six accounting-processing stages', () => {
  const episode = readJson('data/podcast-productions/ep026.json');
  assert.equal(episode.sourceOriginalTextSha256, '589cace448fa807509366422b40a3e284f9a80f521ca720b0722f19e3cadb43f');
  assert.match(episode.officialOriginalText, /以營利為目的之事業/);
  for (const term of ['辨認', '衡量', '記載', '分類', '彙總', '編製財務報表']) {
    assert.match(episode.transcriptText, new RegExp(term));
  }
  assert.match(episode.transcriptText, /六個動作/);
  assert.doesNotMatch(episode.transcriptText, /七個動作|七步驟/);
});

test('EP027 labels its scenario and does not invent who qualifies as a responsible person', () => {
  const episode = readJson('data/podcast-productions/ep027.json');
  assert.equal(episode.sourceOriginalTextSha256, '903627b1b372fd883ea37941ce1bc5c764821cdbf18633be82e1af79e20d942e');
  assert.match(episode.transcriptText, /依現行條文設計的記憶情境，不是考選部原題/);
  assert.match(episode.transcriptText, /公司法、商業登記法及其他法律/);
  assert.match(episode.transcriptText, /不能只因為他處理帳務/);
  assert.doesNotMatch(episode.transcriptText, /經理人一定是商業負責人|會計人員就是商業負責人/);
});

test('EP028 uses the complete official 103 Bookkeeper question 24 and answer D', () => {
  const evidence = readJson('data/podcast-question-evidence/ep028-103-bookkeeper-regulations-q24.json');
  assert.deepEqual(
    {
      rocYear: evidence.rocYear,
      exam: evidence.exam,
      level: evidence.level,
      category: evidence.category,
      subject: evidence.subject,
      subjectCode: evidence.subjectCode,
      questionNo: evidence.questionNo,
      officialAnswer: evidence.officialAnswer,
      verifiedAnswer: evidence.verifiedAnswer,
    },
    {
      rocYear: 103,
      exam: '專門職業及技術人員普通考試',
      level: '普通考試',
      category: '記帳士',
      subject: '記帳相關法規概要',
      subjectCode: '2602',
      questionNo: 24,
      officialAnswer: 'D',
      verifiedAnswer: 'D',
    },
  );
  assert.equal(evidence.answerConflict, false);
  assert.equal(evidence.questionPdfSha256, 'bf0b836893eef75cdc4f4eead874bcd8da5ee6915ede044337850bc247e60257');
  assert.equal(evidence.answerPdfSha256, '561088d6adf5bedb238342be705432aa6d013e4b355585abc837f554ec9f9981');
  assert.equal(evidence.law, '商業會計法');
  assert.equal(evidence.article, '14');
  assert.equal(evidence.verifyStatus, 'done');
  assert.equal(evidence.reviewStatus, 'first_review_passed');
  assert.equal(evidence.backReviewStatus, 'rechecked');

  const episode = readJson('data/podcast-productions/ep028.json');
  assert.equal(episode.sourceOriginalTextSha256, '4e169522b2bd4925d0a624b3729d10bc409fec1b7303e07af0e5224513f518a0');
  assert.equal(episode.questionEvidence, 'data/podcast-question-evidence/ep028-103-bookkeeper-regulations-q24.json');
  assert.ok(episode.transcriptText.includes(evidence.stem));
  for (const option of Object.values(evidence.options)) {
    assert.ok(episode.transcriptText.includes(option));
  }
  assert.match(episode.transcriptText, /一百零三年記帳士考試/);
  assert.match(episode.transcriptText, /答案是 D/);
  assert.match(episode.transcriptText, /原始憑證.*證明會計事項之經過/s);
  assert.match(episode.transcriptText, /記帳憑證.*證明處理會計事項人員之責任/s);
  assert.match(episode.transcriptText, /外來憑證.*取得/);
  assert.match(episode.transcriptText, /對外憑證.*給予/);
});
