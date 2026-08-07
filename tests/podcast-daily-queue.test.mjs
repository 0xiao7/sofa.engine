import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { selectDueEpisode, validateQueue } from '../scripts/podcast-queue-lib.mjs';
import { buildContentFromSource } from '../scripts/build-podcast-law-content.mjs';

const queue = JSON.parse(readFileSync(new URL('../data/podcast-law-queue.json', import.meta.url), 'utf8'));

test('queue contains 30 source-locked nonduplicate law episodes', () => {
  const result = validateQueue(queue);
  assert.equal(result.episodes, 30);
  assert.deepEqual(queue.episodes.map(row => row.id),
    Array.from({ length: 30 }, (_, index) => `EP${String(index + 7).padStart(3, '0')}`));
});

test('queue rejects duplicate source angles', () => {
  const broken = structuredClone(queue);
  broken.episodes[1].sourceAngle = broken.episodes[0].sourceAngle;
  assert.throws(() => validateQueue(broken), /duplicate sourceAngle/);
});

test('queue rejects non-official legal sources', () => {
  const broken = structuredClone(queue);
  broken.episodes[0].officialLawUrl = 'https://example.com/law';
  assert.throws(() => validateQueue(broken), /officialLawUrl/);
});

test('queue rejects product-led episodes and PRC wording', () => {
  const product = structuredClone(queue);
  product.episodes[0].title = '產品功能介紹｜一鍵刷題';
  assert.throws(() => validateQueue(product), /exam label|product-led/);

  const prc = structuredClone(queue);
  prc.episodes[0].summary = '透過視頻與信息快速理解法規。';
  assert.throws(() => validateQueue(prc), /PRC wording/);
});

test('release selection stops at a non-approved head episode', () => {
  assert.equal(selectDueEpisode(queue, '2026-08-31T13:00:00Z'), null);
});

test('content builder keeps law text and stored analysis as the only body source', () => {
  const row = queue.episodes[0];
  const source = {
    title: '§ 01｜課稅範圍',
    original_text: '在中華民國境內銷售貨物或勞務及進口貨物，均依本法規定課徵加值型或非加值型之營業稅。',
    sections: {
      規範意旨與條文解析: '• 條文邏輯：境內銷售或進口，進入營業稅課稅範圍。',
      執業要點與考情提示: '• 出題焦點：先判斷交易是否落在課稅範圍。',
      核心摘要與記憶策略: '• 專業口訣：境內銷售、進口貨物。',
    },
  };
  const content = buildContentFromSource(row, source);
  assert.match(content.transcriptText, /在中華民國境內銷售貨物或勞務/);
  assert.match(content.transcriptText, /境內銷售、進口貨物/);
  assert.doesNotMatch(content.transcriptText, /產品|訂閱|優惠/);
  assert.match(content.vtt, /^WEBVTT/);
});
