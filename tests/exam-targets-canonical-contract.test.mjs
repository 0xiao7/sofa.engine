import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync('exam-targets.js', 'utf8');
function catalog(search = '') {
  const values = new Map();
  const localStorage = { getItem:k => values.get(k) ?? null, setItem:(k,v) => values.set(k,String(v)) };
  const window = { location:{search}, localStorage, dispatchEvent(){} };
  const document = { querySelectorAll(){ return []; } };
  vm.runInNewContext(source, { window, document, localStorage, URLSearchParams, CustomEvent:class { constructor(name,init){this.type=name;this.detail=init.detail;} }, Date, Math, Object, String });
  return { api:window.SoFaExamTargets, values };
}

test('real estate broker uses one canonical key and legacy URLs normalize to it', () => {
  const { api, values } = catalog('?target=realestate');
  assert.equal(api.TARGETS.realestate, undefined);
  assert.equal(api.resolveTarget().key, 'real_estate_broker');
  assert.equal(values.get('sofa_exam_key'), 'real_estate_broker');
  assert.equal(api.toApiKey('real_estate_broker'), 'realestate');
});

test('official group window and actual class window are source-dated', () => {
  const { api } = catalog();
  assert.equal(api.OFFICIAL_SOURCE.groupStart, '2026-11-14');
  assert.equal(api.OFFICIAL_SOURCE.groupEnd, '2026-11-16');
  assert.equal(api.OFFICIAL_SOURCE.checkedAt, '2026-09-08');
  assert.match(api.OFFICIAL_SOURCE.url, /^https:\/\/wwwc\.moex\.gov\.tw\//);
  assert.equal(api.TARGETS.real_estate_broker.examEndDate.slice(0,10), '2026-11-15');
  assert.equal(api.TARGETS.bookkeeper.verificationLabel, '已確認');
  assert.equal(api.TARGETS.landadmin.verificationLabel, '未確認');
});

test('expired exams are excluded and unknown dates remain neutral', () => {
  const { api } = catalog();
  assert.deepEqual(Array.from(api.listAvailable('2026-11-14T00:00:00+08:00'), t => t.key), ['bookkeeper','real_estate_broker']);
  assert.deepEqual(Array.from(api.listAvailable('2026-11-16T00:00:00+08:00'), t => t.key), []);
  assert.equal(api.daysUntil(api.TARGETS.landadmin), null);
  assert.equal(api.UNKNOWN_TARGET.verificationLabel, '未確認');
});

test('target and subject selection share canonical state', () => {
  const { api, values } = catalog();
  api.selectTarget('realestate');
  const subject = api.selectSubject('民法概要');
  assert.equal(subject.key, 'civil_law');
  assert.equal(values.get('sofa_exam_target'), 'real_estate_broker');
  assert.equal(values.get('sofa_exam_subject'), 'civil_law');
});

test('dashboard login index and share consume the shared catalog without exam date literals', () => {
  for (const page of ['dashboard.html','login.html','index.html','share.html']) {
    const html = fs.readFileSync(page, 'utf8');
    assert.match(html, /exam-targets\.js/);
    assert.doesNotMatch(html, /2026-11-1[456]/);
  }
});
