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
  EP023: { article: '22', format: '法條精讀' },
  EP024: { article: '23', format: '情境背誦' },
  EP025: { article: '24', format: '題目帶思路' },
};

test('EP023-EP025 are three distinct source-locked Bookkeeper lanes with full transcripts', () => {
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
        law: '稅捐稽徵法',
        article: contract.article,
        format: contract.format,
        voicePolicyId: 'podcast-ep001-master-v1',
      },
    );
    assert.equal(episode.officialLawUrl, `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340001&flno=${contract.article}`);
    assert.equal(sha256(episode.officialOriginalText), episode.sourceOriginalTextSha256);
    assert.ok(episode.segments.some((segment) => segment.cue === true));
    assert.ok(episode.segments.some((segment) => segment.silence === true && segment.seconds === 6));
    const spoken = episode.segments.filter((segment) => segment.text).map((segment) => segment.text).join('\n');
    assert.equal(episode.transcriptText, spoken);
    assert.match(spoken, /記帳士國考/);
    assert.doesNotMatch(spoken, /視頻|信息|質量|賬號|打印|會ㄏㄨㄟˋ計/);
  }
});

test('EP023 preserves all six Article 22 starting points without inventing a seventh', () => {
  const episode = readJson('data/podcast-productions/ep023.json');
  assert.match(episode.officialOriginalText, /一、.*自申報日起算/s);
  assert.match(episode.officialOriginalText, /二、.*申報期間屆滿之翌日起算/s);
  assert.match(episode.officialOriginalText, /三、印花稅.*貼用印花稅票日起算/s);
  assert.match(episode.officialOriginalText, /四、.*徵期屆滿之翌日起算/s);
  assert.match(episode.officialOriginalText, /五、土地增值稅.*收件日起算/s);
  assert.match(episode.officialOriginalText, /六、.*核課權可行使之日起算/s);
  assert.doesNotMatch(episode.transcriptText, /第七款/);
});

test('EP024 labels its memory scenario and separates assessment from collection clocks', () => {
  const episode = readJson('data/podcast-productions/ep024.json');
  assert.match(episode.transcriptText, /依現行條文設計的記憶情境，不是考選部原題/);
  assert.match(episode.transcriptText, /核課期間/);
  assert.match(episode.transcriptText, /徵收期間/);
  assert.match(episode.transcriptText, /繳納期間屆滿之翌日起算/);
  assert.doesNotMatch(episode.transcriptText, /官方原題|記帳士歷屆試題/);
});

test('EP025 is transparent about the 113 Indigenous Civil Service tax-law source and answer D', () => {
  const evidence = readJson('data/podcast-question-evidence/ep025-113-indigenous-tax-q1.json');
  assert.deepEqual(
    {
      rocYear: evidence.rocYear,
      exam: evidence.exam,
      level: evidence.level,
      category: evidence.category,
      subject: evidence.subject,
      questionNo: evidence.questionNo,
      officialAnswer: evidence.officialAnswer,
      verifiedAnswer: evidence.verifiedAnswer,
    },
    {
      rocYear: 113,
      exam: '公務人員特種考試原住民族考試',
      level: '三等考試',
      category: '財稅行政',
      subject: '稅務法規',
      questionNo: 1,
      officialAnswer: 'D',
      verifiedAnswer: 'D',
    },
  );
  assert.equal(evidence.answerConflict, false);
  assert.equal(evidence.questionPdfSha256, '34f212aeb121c8503ecd24d17ed094c9fff22d332464918f180355dbeb01d5bb');
  assert.equal(evidence.answerPdfSha256, '4344aa4b581c3e7b5554873716d4e03b1dbc1847f2958008f3bdb12b417b7c72');
  assert.match(evidence.sourceUrl, /^https:\/\/wwwq\.moex\.gov\.tw\//);
  assert.match(evidence.officialAnswerUrl, /^https:\/\/wwwq\.moex\.gov\.tw\//);
  assert.equal(evidence.law, '稅捐稽徵法');
  assert.equal(evidence.article, '24');
  assert.equal(evidence.verifyStatus, 'done');
  assert.equal(evidence.reviewStatus, 'first_review_passed');
  assert.equal(evidence.backReviewStatus, 'rechecked');

  const episode = readJson('data/podcast-productions/ep025.json');
  assert.equal(episode.questionEvidence, 'data/podcast-question-evidence/ep025-113-indigenous-tax-q1.json');
  assert.ok(episode.transcriptText.includes(evidence.stem));
  for (const option of Object.values(evidence.options)) {
    assert.ok(episode.transcriptText.includes(option));
  }
  assert.match(episode.transcriptText, /不是記帳士原題/);
  assert.match(episode.transcriptText, /一百十三年原住民族三等考試/);
  assert.match(episode.transcriptText, /答案是 D/);
  assert.match(episode.transcriptText, /行政救濟程序終結前/);
  assert.match(episode.transcriptText, /營利事業.*三百萬元/);
});
