import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

function loadNormalizer(fileName) {
  const html = readFileSync(new URL(`../${fileName}`, import.meta.url), 'utf8');
  const marker = 'function normalizeSerialForVerification';
  const start = html.indexOf(marker);
  assert.notEqual(start, -1, `${fileName} should define normalizeSerialForVerification`);
  const open = html.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < html.length; i += 1) {
    if (html[i] === '{') depth += 1;
    if (html[i] === '}') depth -= 1;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
  assert.notEqual(end, -1, `${fileName} normalizer function should close`);
  const source = html.slice(start, end);
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${source}; this.normalizeSerialForVerification = normalizeSerialForVerification;`, context);
  return context.normalizeSerialForVerification;
}

function assertSerial(actual, expected) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}

for (const fileName of ['login.html', 'room.html']) {
  test(`${fileName} preserves paid and trial serial formats for verification`, () => {
    const normalize = loadNormalizer(fileName);

    assertSerial(normalize('SOFA-ABCD-EFGH'), {
      serial: 'SOFA-ABCD-EFGH',
      display: 'ABCD-EFGH',
      kind: 'paid',
    });
    assertSerial(normalize('abcd efgh'), {
      serial: 'SOFA-ABCD-EFGH',
      display: 'ABCD-EFGH',
      kind: 'paid',
    });
    assertSerial(normalize('SOFA-T-ABCDEFGH'), {
      serial: 'SOFA-T-ABCDEFGH',
      display: 'T-ABCD-EFGH',
      kind: 'trial',
    });
    assertSerial(normalize('tabcdefgh'), {
      serial: 'SOFA-T-ABCDEFGH',
      display: 'T-ABCD-EFGH',
      kind: 'trial',
    });
  });
}
