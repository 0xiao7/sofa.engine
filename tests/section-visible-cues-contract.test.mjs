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
  assert.match(files.preview, /escapeHtml\(cleanVisibleSpeechCueText\(body \|\| ''\)\)/);
});

test('visible cue cleaner keeps reading punctuation but removes cue labels', () => {
  const cleaner = vm.runInNewContext(`${extractFunction(files.fill, 'cleanVisibleSpeechCueText')}; cleanVisibleSpeechCueText`);
  const text = cleaner('聽覺記憶指引：[重音]代理登記[停頓]測量[停頓]稅務');
  assert.equal(text, '聽覺記憶指引：代理登記，測量，稅務');
  assert.doesNotMatch(text, /重音|停頓|\[/);
});
