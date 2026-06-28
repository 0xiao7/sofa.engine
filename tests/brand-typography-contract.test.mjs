import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const sharedCss = readFileSync(new URL('../sofa.css', import.meta.url), 'utf8');
const dashboardHtml = readFileSync(new URL('../dashboard.html', import.meta.url), 'utf8');
const loginHtml = readFileSync(new URL('../login.html', import.meta.url), 'utf8');
const quizHtml = readFileSync(new URL('../quiz.html', import.meta.url), 'utf8');

test('shared controls keep Chinese-facing UI on the Songti-first stack', () => {
  assert.match(sharedCss, /--serif:"Songti TC","Noto Serif TC","PMingLiU",serif/);
  assert.match(sharedCss, /--sans:var\(--serif\)/);
  assert.match(sharedCss, /Chinese-facing controls stay on the Songti-first brand stack/);
  assert.match(sharedCss, /:where\(a,button,select,input,textarea,\[role="button"\][\s\S]*font-family:var\(--sans\)!important/);
  assert.match(sharedCss, /:where\(a,button,select,input,textarea,\[role="button"\][\s\S]*letter-spacing:0!important/);
  assert.match(sharedCss, /\.brand\{[\s\S]*letter-spacing:\.04em!important/);
  assert.match(sharedCss, /\.brand\{[\s\S]*min-height:44px/);
  assert.match(sharedCss, /\.brand\{[\s\S]*min-width:44px/);
});

test('shared mono usage is reserved for keyboard and machine-like labels', () => {
  assert.match(sharedCss, /Mono is reserved for keyboard hints, codes, counters, and serial-like values/);
  assert.match(sharedCss, /:where\(kbd,code,pre,\.mono,\.key,\.k,\.cv,\.ro,\.lab,\.eb,\.num,\.idx,\.ct,\.seg[\s\S]*font-family:var\(--mono\)!important/);
  assert.match(sharedCss, /\.btn \.k\{[\s\S]*font-family:var\(--mono\)/);
  assert.match(sharedCss, /\.law-dd-btn \.cv\{font-family:var\(--mono\)/);
});

test('login has the same Chinese-control typography guard as shared pages', () => {
  assert.match(loginHtml, /--serif:\s*'Songti TC', 'Noto Serif TC', 'PMingLiU', serif/);
  assert.match(loginHtml, /--sans:\s*var\(--serif\)/);
  assert.match(loginHtml, /Chinese-facing controls stay on the Songti-first brand stack/);
  assert.match(loginHtml, /:where\(a,button,select,textarea\)\{[\s\S]*font-family:var\(--sans\)!important/);
  assert.match(loginHtml, /:where\(\.auth-brand,\.mobile-brand \.b\)\{[\s\S]*font-family:var\(--sans\)!important/);
  assert.match(loginHtml, /:where\(kbd,code,pre,\.mono,\.auth-hero \.eb[\s\S]*\.serial-wrap input[\s\S]*font-family:var\(--mono\)!important/);
  assert.match(loginHtml, /\.auth-brand \{[\s\S]*min-height:44px/);
  assert.match(loginHtml, /\.auth-brand \{[\s\S]*min-width:44px/);
  assert.match(loginHtml, /\.mobile-brand \.b \{[\s\S]*min-height:44px/);
  assert.match(loginHtml, /\.mobile-brand \.b \{[\s\S]*min-width:44px/);
});

test('standalone dashboard keeps Chinese navigation and actions off mono', () => {
  assert.match(dashboardHtml, /Chinese-facing controls stay on the Songti-first brand stack/);
  assert.match(dashboardHtml, /:where\(a,button,select,input,textarea,\[role="button"\][\s\S]*font-family:var\(--sans\)!important/);
  assert.match(dashboardHtml, /:where\(kbd,code,pre,\.mono,\.num,\.idx,\.ct[\s\S]*font-family:var\(--mono\)!important/);
  assert.match(dashboardHtml, /\.brand\{[\s\S]*min-height:44px/);
  assert.match(dashboardHtml, /\.brand\{[\s\S]*min-width:44px/);
});

test('quiz question text is forced back to the Songti article-reading stack', () => {
  assert.match(quizHtml, /\.q-stem p\{font-family:var\(--serif\)/);
  assert.match(quizHtml, /#questionBox\{font-family:var\(--serif\)!important;letter-spacing:\.02em!important\}/);
});
