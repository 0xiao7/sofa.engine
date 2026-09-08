import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const dashboard = fs.readFileSync('dashboard.html', 'utf8');
const login = fs.readFileSync('login.html', 'utf8');
const practice = fs.readFileSync('practice.html', 'utf8');
const quiz = fs.readFileSync('quiz.html', 'utf8');
const fill = fs.readFileSync('fill.html', 'utf8');
const notes = fs.readFileSync('notes.html', 'utf8');
const lawPreview = fs.readFileSync('law-preview.html', 'utf8');

test('expired members stay signed in and continue inside dashboard', () => {
  assert.doesNotMatch(dashboard, /id="expire-overlay"/);
  assert.doesNotMatch(dashboard, /function showExpireOverlay/);
  const policyFn = dashboard.match(/function applyDashboardAccessPolicy\(policy\)\{[\s\S]*?\n\}/)?.[0] || '';
  assert.doesNotMatch(policyFn, /removeItem\(['"]sofa_(uid|token)/);
});

test('signed-in free study mutations are visibly locked in place', () => {
  assert.match(dashboard, /function applyPaidFeatureLocks/);
  assert.match(dashboard, /data-paid-feature="study-plan"/);
  assert.match(dashboard, /付費鎖定/);
  assert.match(dashboard, /isPaidFeatureLocked\('study-plan'\)/);
  assert.match(dashboard, /需要有效方案/);
});

test('paid feature lock disables controls and restores them after renewal', () => {
  const source = ['isPaidFeatureLocked', 'paidFeatureLockMessage', 'applyPaidFeatureLocks'].map((name) => {
    const match = dashboard.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`));
    assert.ok(match, `${name} must exist`);
    return match[0];
  }).join('\n');
  const classNames = new Set();
  const control = {
    dataset: {}, disabled: false, textContent: '排課', title: '',
    setAttribute(name, value){ this[name] = value; },
    classList: { toggle(name, on){ on ? classNames.add(name) : classNames.delete(name); } },
  };
  const state = {
    dataset: {}, textContent: '原始說明',
    classList: { add(){}, remove(){} },
  };
  const document = {
    querySelectorAll(){ return [control]; },
    getElementById(){ return state; },
  };
  const window = { __sofaAccessPolicy: null };
  const run = new Function('window', 'document', `${source}; return {applyPaidFeatureLocks};`)(window, document);
  run.applyPaidFeatureLocks({state:'expired_serial', tier:'free', authenticated:true, paid:false});
  assert.equal(control.disabled, true);
  assert.match(control.textContent, /付費鎖定/);
  assert.equal(classNames.has('paid-feature-locked'), true);
  run.applyPaidFeatureLocks({state:'active_paid', tier:'paid', authenticated:true, paid:true});
  assert.equal(control.disabled, false);
  assert.equal(control.textContent, '排課');
  assert.equal(state.textContent, '原始說明');
});

test('paid-only API refusal is not mislabeled as a network sync failure', () => {
  const saveMessage = dashboard.match(/function _studySaveMessage\([^)]*\)\{[\s\S]*?\n\}/)?.[0] || '';
  assert.match(saveMessage, /__http_status === 403/);
  assert.match(saveMessage, /付費鎖定/);
});

test('expiry is not an automatic full-screen blocker', () => {
  assert.doesNotMatch(dashboard, /setTimeout\(showExpireOverlay/);
  assert.match(dashboard, /基本練習/);
  assert.match(dashboard, /帳號與紀錄/);
});

test('signed-in free tier uses server access policy instead of clearing identity', () => {
  assert.match(dashboard, /access_policy/);
  assert.match(dashboard, /expired_serial/);
  assert.match(dashboard, /invalid_entitlement/);
  assert.match(dashboard, /applyDashboardAccessPolicy/);
  assert.doesNotMatch(dashboard, /切換免費版（不保留查詢紀錄）/);
});

test('free and expired copy keeps core use internal and describes locks', () => {
  assert.match(dashboard, /查法條、基本練習與每日一題/);
  assert.match(dashboard, /進階功能會在原位置顯示鎖定/);
  assert.doesNotMatch(dashboard, /免費版不儲存學習紀錄/);
});

test('login stores access policy and always enters member dashboard', () => {
  assert.match(login, /sofa_access_policy/);
  assert.match(login, /dashboardTargetAfterLogin/);
  assert.doesNotMatch(login, /data\.access_policy[\s\S]{0,160}(free\.html|pricing\.html)/);
});

test('practice quiz and fill open anonymous users in free mode without redirect', () => {
  for (const [name, html] of Object.entries({practice, quiz, fill})) {
    assert.doesNotMatch(html, /window\.location\.href = 'login\.html\?redirect=/, name);
    assert.match(html, /localStorage\.setItem\('sofa_free', 'FREE'\)/, name);
  }
});

test('paid content fails closed on expired or unknown entitlement', () => {
  assert.match(quiz, /d\.access_policy/);
  assert.doesNotMatch(quiz, /_setPaid\(true\);\s*return false/);
  assert.match(lawPreview, /d\.access_policy/);
  assert.doesNotMatch(lawPreview, /if\(!d\)\{ readerPaid = true/);
  assert.match(notes, /d\.access_policy/);
  assert.doesNotMatch(notes, /if\(!d\)\{ finish\(true\)/);
});
