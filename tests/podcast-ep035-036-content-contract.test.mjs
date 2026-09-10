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

test('EP035-EP036 preserve production, pronunciation and transcript contracts', () => {
  const expected = {
    EP035: { exam: '地政士', law: '土地登記規則', article: '4', format: '情境背誦' },
    EP036: { exam: '地政士', law: '土地登記規則', article: '7', format: '題目帶思路' },
  };
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

test('EP035 labels its memory scene and preserves every Article 4 right and exception path', () => {
  const episode = readJson('data/podcast-productions/ep035.json');
  assert.equal(episode.officialLawUrl, 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0060003&flno=4');
  assert.equal(episode.sourceOriginalTextSha256, 'a8766938f55ad1918ea0b15edd54b427450a3b3d19e679edb27b8fedbed4d957');
  assert.match(episode.transcriptText, /依現行條文設計的記憶情境，不是考選部原題/);
  for (const right of ['所有權', '地上權', '永佃權', '不動產役權', '典權', '抵押權', '耕作權', '農育權', '依習慣形成之物權']) {
    assert.match(episode.transcriptText, new RegExp(right));
  }
  assert.match(episode.transcriptText, /九十九年八月三日前發生之永佃權/);
  assert.match(episode.transcriptText, /第一款至第八款.*性質.*相同或相類/s);
  assert.match(episode.transcriptText, /中央地政機關審定/);
  assert.match(episode.transcriptText, /添註其原有名稱/);
});

test('EP036 uses the complete official question and official answer A', () => {
  const evidence = readJson('data/podcast-question-evidence/ep036-113-disabled-civil-service-land-q22.json');
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
      rocYear: 113,
      exam: '公務人員特種考試身心障礙人員考試',
      level: '五等考試',
      category: '地政',
      subject: '土地法大意',
      subjectCode: '3506',
      questionNo: 22,
      points: 2,
    },
  );
  assert.equal(evidence.questionPdfSha256, '29be2c8738ee71c2debc9f5dd220245c0abaf878d1c3b10124ac77836292654a');
  assert.equal(evidence.answerPdfSha256, '19ddf5cc75dfe40ac2bc3953c1567831ad88128dc60b8541bb0c9de4fc8903b4');
  assert.equal(evidence.officialAnswer, 'A');
  assert.equal(evidence.answerConflict, false);
  assert.equal(evidence.officialLawUrl, 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0060003&flno=7');
  assert.equal(evidence.verifyStatus, 'done');
  assert.equal(evidence.reviewStatus, 'first_review_passed');
  assert.equal(evidence.backReviewStatus, 'rechecked');

  const episode = readJson('data/podcast-productions/ep036.json');
  assert.equal(episode.officialLawUrl, 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0060003&flno=7');
  assert.equal(episode.sourceOriginalTextSha256, '6a7e45a4518ca980a384653fd4ec8af860d722c04c680d792d4801f024e239e2');
  assert.equal(episode.questionEvidence, 'data/podcast-question-evidence/ep036-113-disabled-civil-service-land-q22.json');
  assert.ok(episode.transcriptText.includes(evidence.stem));
  for (const option of evidence.options) assert.ok(episode.transcriptText.includes(option.label + '，' + option.text));
  assert.match(episode.transcriptText, /不是地政士原題/);
  assert.match(episode.transcriptText, /官方答案是 A/);
  assert.match(episode.transcriptText, /法院判決塗銷確定/);
  assert.doesNotMatch(episode.transcriptText, /任何法院判決都可以塗銷|登記機關可自行決定塗銷/);
});

test('EP035-EP036 canonical queue and content sources use live non-padded MOJ article URLs', () => {
  const queue = readJson('data/podcast-law-queue.json').episodes;
  const content = readJson('data/podcast-law-content.json').contents;
  for (const collection of [queue, content]) {
    assert.equal(collection.find((item) => item.id === 'EP035').officialLawUrl, 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0060003&flno=4');
    assert.equal(collection.find((item) => item.id === 'EP036').officialLawUrl, 'https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=D0060003&flno=7');
  }
});
