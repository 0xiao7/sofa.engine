#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const REQUIRED_SECTIONS = ['規範意旨與條文解析', '執業要點與考情提示', '核心摘要與記憶策略'];

function clean(text) {
  return String(text || '')
    .replace(/\[(?:重音|停頓)\]/g, '')
    .replace(/\u3000/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sourceLine(section, labels = []) {
  const lines = clean(section).split('\n').map(line => line.replace(/^[•◦\-\s]+/, '').trim()).filter(Boolean);
  for (const label of labels) {
    const index = lines.findIndex(line => line.startsWith(`${label}：`) || line.startsWith(`${label}:`));
    if (index >= 0) {
      const inline = lines[index].replace(new RegExp(`^${label}[:：]`), '').trim();
      if (inline) return inline;
      if (lines[index + 1]) return lines[index + 1];
    }
  }
  return lines[0] || '';
}

function timestamp(total) {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.000`;
}

function buildVtt(segments) {
  let cursor = 0;
  const lines = ['WEBVTT', ''];
  for (const segment of segments) {
    const start = cursor;
    cursor += segment.seconds;
    lines.push(`${timestamp(start)} --> ${timestamp(cursor)}`, segment.text, '');
  }
  return `${lines.join('\n').trim()}\n`;
}

export function buildContentFromSource(row, source) {
  if (!clean(source?.original_text) || !source?.sections) throw new Error(`${row.id} source is incomplete`);
  for (const key of REQUIRED_SECTIONS) {
    if (!clean(source.sections[key])) throw new Error(`${row.id} missing ${key}`);
  }
  const originalText = clean(source.original_text);
  const logic = sourceLine(source.sections['規範意旨與條文解析'], ['條文邏輯', '立法目的']);
  const examPoint = sourceLine(source.sections['執業要點與考情提示'], ['出題焦點', '關鍵陷阱', '考點層級']);
  const memory = sourceLine(source.sections['核心摘要與記憶策略'], ['專業口訣', '關鍵字組', '聽覺記憶指引']);
  if (!logic || !examPoint || !memory) throw new Error(`${row.id} stored analysis cannot form an episode`);

  const segments = [
    { role: 'opening', seconds: 8, text: `SoFa 輕聲補一條。今天是${row.exam}，補${row.law}第${row.article}條。` },
    { role: 'law', seconds: Math.max(20, Math.ceil(originalText.length / 5)), text: `先聽法條原文。${originalText}` },
    { role: 'logic', seconds: 15, text: `這條的判斷入口是：${logic}` },
    { role: 'exam', seconds: 15, text: `國考要注意：${examPoint}` },
    { role: 'memory', seconds: 12, text: `最後記住：${memory}` },
    { role: 'cta', seconds: 6, text: row.cta },
  ];
  const transcriptText = segments.map(segment => segment.text).join('\n\n');
  if (/產品功能介紹|訂閱方案|限時優惠|立即購買/.test(transcriptText)) throw new Error(`${row.id} product-led language in law episode`);
  return {
    id: row.id,
    title: row.title,
    exam: row.exam,
    law: row.law,
    article: row.article,
    articleId: row.articleId,
    sourceApi: row.sourceApi,
    officialLawUrl: row.officialLawUrl,
    sourceOriginalTextSha256: createHash('sha256').update(originalText).digest('hex'),
    sourceAnalysisSha256: createHash('sha256').update(REQUIRED_SECTIONS.map(key => clean(source.sections[key])).join('\n')).digest('hex'),
    originalText,
    segments,
    transcriptText,
    vtt: buildVtt(segments),
    status: 'content_verified_audio_pending',
  };
}

export async function buildBatch(queue) {
  const contents = [];
  for (const row of queue.episodes) {
    const response = await fetch(row.sourceApi, { headers: { 'user-agent': 'sofa-podcast-law-queue/1.0' } });
    if (!response.ok) throw new Error(`${row.id} source API returned ${response.status}`);
    contents.push(buildContentFromSource(row, await response.json()));
  }
  return { schemaVersion: 1, builtAt: new Date().toISOString(), contents };
}

async function main() {
  const queuePath = process.argv[2] || 'data/podcast-law-queue.json';
  const outputPath = process.argv[3] || 'data/podcast-law-content.json';
  const queue = JSON.parse(await readFile(queuePath, 'utf8'));
  const result = await buildBatch(queue);
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`built ${result.contents.length} source-locked Podcast scripts: ${outputPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
