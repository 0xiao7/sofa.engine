import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../login.html', import.meta.url), 'utf8');

test('login keeps serial entry while allowing native iOS reader-safe copy', () => {
  assert.match(html, /id="serial"/);
  assert.match(html, /function isIOSReaderApp/);
  assert.match(html, /applyIOSReaderLoginCopy/);
  assert.match(html, /序號由 SoFa 提供/);
});

test('native iOS login can hide external purchase and LINE trial prompts', () => {
  assert.match(html, /data-ios-reader-hide/);
  assert.match(html, /購買後收到的序號/);
  assert.match(html, /querySelectorAll\('\[data-ios-reader-hide\]'\)/);
  assert.match(html, /el\.style\.display = 'none'/);
});

test('native iOS login reserves the status-bar safe area without affecting normal web', () => {
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1\.0, viewport-fit=cover">/);
  assert.match(html, /document\.documentElement\.classList\.add\('ios-reader-app'\)/);
  assert.match(html, /html\.ios-reader-app\s+\.auth-r\s*\{[^}]*padding-top:\s*calc\(32px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(html, /@media \(max-width: 900px\)[\s\S]*html\.ios-reader-app\s+\.auth-r\s*\{[^}]*padding-top:\s*calc\(28px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(html, /@media \(max-width: 540px\)[\s\S]*html\.ios-reader-app\s+\.auth-r\s*\{[^}]*padding-top:\s*calc\(22px \+ env\(safe-area-inset-top, 0px\)\)/);
});

test('desktop login keeps the first screen compact and moves long support copy into details', () => {
  assert.match(html, /\.auth-hero\s*\{[^}]*margin-top:\s*0[^}]*padding-bottom:\s*0/);
  assert.match(html, /\.auth-form\s*\{[^}]*flex:\s*0 1 auto/);
  assert.match(html, /\.auth-r \.top\s*\{[\s\S]*?z-index:\s*3/);
  assert.match(html, /\.auth-form\s*\{[\s\S]*?z-index:\s*2/);
  assert.match(html, /class="auth-support-details"/);
  assert.match(html, /<summary>序號、退費與客服說明<\/summary>/);
  assert.match(html, /\.auth-support-details:not\(\[open\]\) \.support-copy\s*\{[\s\S]*?display:none/);
  assert.match(html, /購買後 7 天內且序號未啟用/);
});

test('login points trial users to web quiz before LINE', () => {
  assert.match(html, /還沒準備購買？先免費做題，看弱點/);
  assert.match(html, /href="quiz\.html\?free=1"/);
  assert.doesNotMatch(html, /加入 LINE 索取體驗序號/);
});

test('short desktop viewports keep the login CTA and footer inside the first screen', () => {
  assert.match(html, /@media \(max-height: 820px\) and \(min-width: 901px\)/);
  assert.match(html, /\.auth-r\s*\{[^}]*padding:\s*24px 44px 24px/);
  assert.match(html, /\.auth-form\s*\{[^}]*padding:\s*18px 0 14px/);
  assert.match(html, /\.auth-form h2\s*\{[^}]*font-size:\s*28px/);
  assert.match(html, /\.serial-card\s*\{[^}]*padding:\s*20px 22px 18px/);
  assert.match(html, /\.auth-hint\s*\{[^}]*margin-top:\s*10px/);
});

test('serial and magic login mark local study progress for dashboard handoff', () => {
  assert.match(html, /STUDY_LOCAL_KEY\s*=\s*'sofa\.study\.localPlan\.v1'/);
  assert.match(html, /STUDY_AFTER_LOGIN_SYNC_KEY\s*=\s*'sofa\.study\.afterLoginSync\.v1'/);
  assert.match(html, /function markStudyLocalProgressForLogin/);
  assert.match(html, /localStorage\.setItem\(STUDY_AFTER_LOGIN_SYNC_KEY/);
  assert.match(html, /localStorage\.setItem\('sofa_uid', data\.uid\);[\s\S]{0,180}markStudyLocalProgressForLogin\(\);[\s\S]{0,80}window\.location\.href = 'dashboard\.html'/);
  assert.match(html, /if \(data\.token\) localStorage\.setItem\('sofa_token', data\.token\);[\s\S]{0,180}markStudyLocalProgressForLogin\(\);[\s\S]{0,80}window\.location\.href = 'dashboard\.html'/);
});
