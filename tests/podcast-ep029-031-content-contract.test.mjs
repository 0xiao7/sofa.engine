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
  EP029: { exam: '記帳士', law: '公司法', article: '6', format: '法條精讀' },
  EP030: { exam: '記帳士', law: '公司法', article: '8', format: '情境背誦' },
  EP031: { exam: '地政士', law: '土地法', article: '37', format: '題目帶思路' },
};

test('EP029-EP031 preserve the three-lane production and transcript contract', () => {
  for (const [episodeId, contract] of Object.entries(expected)) {
    const episode = readJson('data/podcast-productions/' + episodeId.toLowerCase() + '.json');
    assert.deepEqual(
      {
        episodeId: episode.episodeId,
        exam: episode.exam,
        law: episode.law,
        article: episode.article,
        format: episode.format,
        voicePolicyId: episode.voicePolicyId,
      },
      { episodeId, ...contract, voicePolicyId: 'podcast-ep001-master-v1' },
    );
    assert.equal(sha256(episode.officialOriginalText), episode.sourceOriginalTextSha256);
    assert.ok(episode.segments.some((segment) => segment.cue === true));
    assert.ok(episode.segments.some((segment) => segment.silence === true && segment.seconds === 6));
    const spoken = episode.segments.filter((segment) => segment.text).map((segment) => segment.text).join('\n');
    assert.equal(episode.transcriptText, spoken);
    assert.match(spoken, new RegExp(contract.exam + '國考'));
    assert.match(spoken, /SoFa 官網/);
    assert.doesNotMatch(spoken, /視頻|信息|質量|賬號|打印|會ㄏㄨㄟˋ計/);
  }
});

test('EP029 reads Article 6 precisely without turning registration into a filing detail', () => {
  const episode = readJson('data/podcast-productions/ep029.json');
  assert.equal(episode.officialLawUrl, 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=J0080001&flno=6');
  assert.equal(episode.sourceOriginalTextSha256, 'dd997a497bf2fd812026f1c6408f4b4b51346724b6203b967e5d4e6617c8c0f6');
  assert.equal(episode.officialOriginalText, '公司非在中央主管機關登記後，不得成立。');
  assert.match(episode.transcriptText, /中央主管機關登記後/);
  assert.match(episode.transcriptText, /不得成立/);
  assert.doesNotMatch(episode.transcriptText, /報備後即可成立|申請送出即成立/);
});

test('EP030 labels its scenario and preserves all three layers of Article 8', () => {
  const episode = readJson('data/podcast-productions/ep030.json');
  assert.equal(episode.officialLawUrl, 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=J0080001&flno=8');
  assert.equal(episode.sourceOriginalTextSha256, 'd99da0ff90d12307b4aca800c04d8cb94689b9b6566429f664dc632aa06dab8e');
  assert.match(episode.transcriptText, /依現行條文設計的記憶情境，不是考選部原題/);
  assert.match(episode.transcriptText, /無限公司、兩合公司/);
  assert.match(episode.transcriptText, /有限公司、股份有限公司/);
  assert.match(episode.transcriptText, /在執行職務範圍內/);
  assert.match(episode.transcriptText, /非董事.*實質上執行董事業務/s);
  assert.match(episode.transcriptText, /實質控制公司之人事、財務或業務經營/);
  assert.doesNotMatch(episode.transcriptText, /所有經理人永遠都是公司負責人|經理人不論職務範圍皆為公司負責人/);
});

test('EP031 uses the complete official essay and keeps the no-official-answer boundary', () => {
  const evidence = readJson('data/podcast-question-evidence/ep031-101-disabled-civil-service-land-q3.json');
  assert.deepEqual(
    {
      rocYear: evidence.rocYear,
      exam: evidence.exam,
      level: evidence.level,
      category: evidence.category,
      subject: evidence.subject,
      subjectCode: evidence.subjectCode,
      questionNo: evidence.questionNo,
      points: evidence.points,
    },
    {
      rocYear: 101,
      exam: '公務人員特種考試身心障礙人員考試',
      level: '三等考試',
      category: '地政',
      subject: '土地法規與土地登記',
      subjectCode: '30330',
      questionNo: 3,
      points: 25,
    },
  );
  assert.equal(evidence.questionPdfSha256, '6681ca6f14453172b659bb251834fb50cfad5b70e4d149485a0160923b61d949');
  assert.equal(evidence.officialAnswer, null);
  assert.equal(evidence.officialAnswerUrl, null);
  assert.equal(evidence.answerType, '申論題，考選部未提供標準答案');
  assert.equal(evidence.answerConflict, null);
  assert.equal(evidence.verifyStatus, 'done');
  assert.equal(evidence.reviewStatus, 'first_review_passed');
  assert.equal(evidence.backReviewStatus, 'rechecked');
  assert.match(evidence.normalization, /相容字形/);

  const episode = readJson('data/podcast-productions/ep031.json');
  assert.equal(episode.officialLawUrl, 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0060001&flno=37');
  assert.equal(episode.sourceOriginalTextSha256, 'bf7cd7973f26d63a0c1cb08c9bde038a388033732a494828275279b4b76e0096');
  assert.equal(episode.questionEvidence, 'data/podcast-question-evidence/ep031-101-disabled-civil-service-land-q3.json');
  assert.ok(episode.transcriptText.includes(evidence.stem));
  assert.match(episode.transcriptText, /不是地政士原題/);
  assert.match(episode.transcriptText, /考選部沒有提供這題的官方標準答案/);
  assert.match(episode.transcriptText, /權利主體、權利客體、法律關係/);
  assert.match(episode.transcriptText, /土地及建築改良物/);
  assert.match(episode.transcriptText, /所有權與他項權利/);
  assert.doesNotMatch(episode.transcriptText, /(?:本題|這題)的標準答案是|以下就是唯一正解/);
});
