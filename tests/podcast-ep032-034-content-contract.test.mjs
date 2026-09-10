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
  EP032: { exam: '地政士', law: '土地法', article: '43', format: '法條精讀' },
  EP033: { exam: '地政士', law: '土地稅法', article: '3', format: '情境背誦' },
  EP034: { exam: '地政士', law: '土地稅法', article: '5', format: '題目帶思路' },
};

test('EP032-EP034 preserve the three-lane production and transcript contract', () => {
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
    assert.match(spoken, /地政士國考/);
    assert.match(spoken, /SoFa 官網/);
    assert.doesNotMatch(spoken, /視頻|信息|質量|賬號|打印|會ㄏㄨㄟˋ計/);
  }
});

test('EP032 reads Land Act Article 43 precisely without overstating its effect', () => {
  const episode = readJson('data/podcast-productions/ep032.json');
  assert.equal(episode.officialLawUrl, 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0060001&flno=43');
  assert.equal(episode.sourceOriginalTextSha256, 'a6a1e9bebfddfbb71cd7d9967cb974660676354805ed5c67b3b2a5a5da02fba1');
  assert.equal(episode.officialOriginalText, '依本法所為之登記，有絕對效力。');
  assert.match(episode.transcriptText, /依本法所為之登記，有絕對效力/);
  assert.match(episode.transcriptText, /登記制度的公示與交易秩序/);
  assert.match(episode.transcriptText, /不要自行擴張成任何錯誤登記都永遠不可推翻/);
  assert.match(episode.transcriptText, /個案仍須連同其他法規與實務判斷/);
});

test('EP033 labels its memory scenario and preserves every Article 3 taxpayer category', () => {
  const episode = readJson('data/podcast-productions/ep033.json');
  assert.equal(episode.officialLawUrl, 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340096&flno=03');
  assert.equal(episode.sourceOriginalTextSha256, 'f46a5546a8f75daeed006a33817e69b13540b2626f3de979ae8367f144f7e7ca');
  assert.match(episode.transcriptText, /依現行條文設計的記憶情境，不是考選部原題/);
  assert.match(episode.transcriptText, /土地所有權人/);
  assert.match(episode.transcriptText, /典權人/);
  assert.match(episode.transcriptText, /承領人/);
  assert.match(episode.transcriptText, /耕作權人/);
  assert.match(episode.transcriptText, /公有或公同共有.*管理機關或管理人/s);
  assert.match(episode.transcriptText, /分別共有.*地價稅.*應有部分/s);
  assert.match(episode.transcriptText, /田賦.*推舉之代表人/s);
  assert.match(episode.transcriptText, /(?:未|沒有)推舉.*各按其應有部分/s);
});

test('EP034 uses the complete official multiple-choice question and official answer', () => {
  const evidence = readJson('data/podcast-question-evidence/ep034-102-civil-service-land-q9.json');
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
      rocYear: 102,
      exam: '公務人員初等考試',
      level: '初等考試',
      category: '地政',
      subject: '土地法大意',
      subjectCode: '3510',
      questionNo: 9,
      points: 2,
    },
  );
  assert.equal(evidence.questionPdfSha256, 'a8d3c7f8e942754f53f51fad90fea6749edfc8d412b2d290e58f4a7da1df586a');
  assert.equal(evidence.answerPdfSha256, '7c678d2973d2382a8021190666392a04a367067d225c1c4796e2ccdeb6afab01');
  assert.equal(evidence.officialAnswer, 'D');
  assert.equal(evidence.answerConflict, false);
  assert.equal(evidence.verifyStatus, 'done');
  assert.equal(evidence.reviewStatus, 'first_review_passed');
  assert.equal(evidence.backReviewStatus, 'rechecked');

  const episode = readJson('data/podcast-productions/ep034.json');
  assert.equal(episode.officialLawUrl, 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0340096&flno=05');
  assert.equal(episode.sourceOriginalTextSha256, 'f35b53f8b08326b54d71d0f9125eb49335ea09facfea9945e011ce750c950ee0');
  assert.equal(episode.questionEvidence, 'data/podcast-question-evidence/ep034-102-civil-service-land-q9.json');
  assert.ok(episode.transcriptText.includes(evidence.stem));
  for (const option of evidence.options) assert.ok(episode.transcriptText.includes(option.label + '，' + option.text));
  assert.match(episode.transcriptText, /不是地政士原題/);
  assert.match(episode.transcriptText, /官方答案是 D/);
  assert.match(episode.transcriptText, /遺贈.*無償移轉/s);
  assert.match(episode.transcriptText, /A 徵收、B 交換與 C 政府照價收買.*有償/s);
});
