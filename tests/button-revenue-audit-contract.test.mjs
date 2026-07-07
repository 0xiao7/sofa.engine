import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

test('login no longer sends serial-less users to LINE as the trial path', () => {
  const html = read('login.html');
  assert.match(html, /還沒有序號？先用網站免登入練習/);
  assert.match(html, /href="quiz\.html\?free=1&start=1&utm_source=login&utm_medium=web&utm_campaign=free_quiz_entry"/);
  assert.doesNotMatch(html, /lin\.ee|加入 LINE|LINE @SoFa|索取體驗序號/);
});

test('pricing hero exposes tracked payment and free-practice actions before the plan list', () => {
  const html = read('pricing.html');
  const heroStart = html.indexOf('<section class="hero">');
  const planStart = html.indexOf('<section class="section">', heroStart);
  const hero = html.slice(heroStart, planStart);
  assert.match(hero, /class="hero-actions"/);
  assert.match(hero, /href="\/checkout\.html\?plan=到考日&utm_source=pricing&utm_medium=hero&utm_campaign=pricing_exam_day"/);
  assert.match(hero, /href="\/quiz\.html\?free=1&start=1&utm_source=pricing&utm_medium=hero&utm_campaign=free_quiz_entry"/);
  assert.ok(hero.indexOf('升級到考日') < planStart - heroStart);
});

test('mobile drill and legal pages include horizontal overflow guards', () => {
  for (const file of ['quiz.html', 'fill.html']) {
    const html = read(file);
    assert.match(html, /html,body\{max-width:100%;overflow-x:hidden\}/);
    assert.match(html, /@media \(max-width:760px\)\{[\s\S]*\.topbar\{max-width:100vw;gap:10px;overflow:hidden\}/);
    assert.match(html, /@media \(max-width:760px\)\{[\s\S]*\.user-pill\{display:none\}/);
    assert.match(html, /@media \(max-width:760px\)\{[\s\S]*\.stage,[\s\S]*\.inner,[\s\S]*(?:\.q-stem|\.fill-card),[\s\S]*\.rail-card\{max-width:100%;min-width:0\}/);
  }
  const terms = read('terms.html');
  assert.match(terms, /html\{background:var\(--navy-3\);max-width:100%;overflow-x:hidden\}/);
  assert.match(terms, /免費用戶可透過網站進行免登入練習/);
  assert.doesNotMatch(terms, /免費用戶可透過 LINE Bot/);
});

test('free drill pages honor the free query flag instead of redirecting to login', () => {
  const free = read('free.html');
  const practice = read('practice.html');
  const fill = read('fill.html');
  assert.match(free, /href="\/quiz\.html\?free=1&start=1&utm_source=free&utm_medium=hero&utm_campaign=free_quiz_entry"/);
  assert.match(practice, /new URLSearchParams\(location\.search\)\.get\('free'\) === '1'/);
  assert.match(fill, /new URLSearchParams\(location\.search\)\.get\('free'\) === '1'/);
});

test('mobile quiz law selector and compact checkout have explicit viewport guards', () => {
  const quiz = read('quiz.html');
  const checkout = read('checkout.html');
  assert.match(quiz, /#lawSelect\{max-width:min\(100%,calc\(100vw - 36px\)\)/);
  assert.match(checkout, /@media \(min-width:781px\) and \(max-height:820px\)/);
  assert.match(checkout, /\.ck-compact-pay-note/);
  assert.ok(
    checkout.indexOf('class="ck-compact-pay-note"') < checkout.indexOf('id="ck-submit"'),
    'compact payment note should sit directly before the primary checkout CTA'
  );
});

test('public drill favicon references resolve to a committed asset', () => {
  for (const file of ['practice.html', 'fill.html', 'quiz.html']) {
    const html = read(file);
    assert.match(html, /href="favicon\.svg"/);
    assert.doesNotMatch(html, /favicon-32\.png/);
  }
  assert.match(read('favicon.svg'), /<svg[^>]+viewBox="0 0 32 32"/);
});
