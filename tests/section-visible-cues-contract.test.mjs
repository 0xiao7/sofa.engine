import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const files = {
  quiz: readFileSync(new URL('../quiz.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, ''),
  fill: readFileSync(new URL('../fill.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, ''),
  practice: readFileSync(new URL('../practice.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, ''),
  dashboard: readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, ''),
  preview: readFileSync(new URL('../law-preview.html', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, ''),
};

function extractFunction(source, name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} must exist`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  assert.fail(`${name} must close`);
}

test('visible section renderers strip speech cue markup from analysis text', () => {
  for (const [name, source] of Object.entries(files)) {
    assert.match(source, /function _?cleanVisibleSpeechCueText/, `${name} needs a visible cue cleaner`);
  }
  assert.match(files.quiz, /body=cleanVisibleSpeechCueText\(body\.trim\(\)\)/);
  assert.match(files.fill, /body=cleanVisibleSpeechCueText\(body\.trim\(\)\)/);
  assert.match(files.practice, /body=cleanVisibleSpeechCueText\(body\.trim\(\)\)/);
  assert.match(files.dashboard, /body = _cleanVisibleSpeechCueText\(body\.trim\(\)\)/);
  assert.match(files.preview, /const visibleText = cleanVisibleSpeechCueText\(body \|\| PREVIEW_LOCK_LEADS\[seg\] \|\| ''\)/);
  assert.match(files.preview, /linkifyLawRefs\(escapeHtml\(visibleText\), currentLawName\)/);
});

test('visible cue cleaner keeps reading punctuation but removes cue labels', () => {
  const cleaner = vm.runInNewContext(`${extractFunction(files.fill, 'cleanVisibleSpeechCueText')}; cleanVisibleSpeechCueText`);
  const text = cleaner('聽覺記憶指引：[重音]代理登記[停頓]測量[停頓]稅務');
  assert.equal(text, '聽覺記憶指引：代理登記，測量，稅務');
  assert.doesNotMatch(text, /重音|停頓|\[/);
});

test('CPI adjusted amount warnings are shared by all visible article analysis surfaces', () => {
  for (const [name, source] of Object.entries(files)) {
    assert.match(source, /function buildCpiAdjustmentNote/, `${name} needs the shared CPI warning helper`);
    assert.match(source, /條文原文、舊題數字和當年度公告額要分開看/, `${name} needs estate and gift concrete amounts`);
    assert.match(source, /113 年度起個人基本所得額扣除額已調整為 750 萬元/, `${name} needs basic tax amount warning`);
    assert.match(source, /115 \/ 114 現行：遺產稅免稅額 1,333 萬/, `${name} needs current estate tax exemption`);
    assert.match(source, /職業工具條文舊基準 40 萬/, `${name} needs old-to-current tool amount`);
  }

  assert.match(files.fill, /renderFillSections\(panel,\s*art\.sections\|\|\{\},\s*art\._plan!=='free',\s*art\)/);
  assert.match(files.practice, /renderPracticeSections\(sp,\s*articleSections,\s*articlePlan!=='free',\s*articleRecord\)/);
  assert.match(files.dashboard, /var cpiHtml = buildCpiAdjustmentNote\(d,\s*d\.sections \|\| \{\}\)/);
  assert.match(files.dashboard, /'<div id="drawer-analysis">' \+ origHtml \+ cpiHtml \+ accHtml \+ '<\/div>'/);
  assert.match(files.preview, /const cpiHtml = buildCpiAdjustmentNote\(d,\s*sections\)/);
  assert.match(files.preview, /\$\{cpiHtml\}/);
});
