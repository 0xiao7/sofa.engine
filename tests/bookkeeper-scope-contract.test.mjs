import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const CONSTITUTION_LAWS = new Set([
  '中華民國憲法',
  '中華民國憲法增修條文',
  '憲法',
  '憲法訴訟法',
]);

function extractConstObject(source, constName) {
  const marker = `const ${constName} =`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${constName} should exist`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') depth -= 1;
    if (depth === 0) return source.slice(open, i + 1);
  }
  assert.fail(`${constName} should close`);
}

function htmlExamLaws(fileName, constName = '_EXAM_LAWS') {
  const source = readFileSync(new URL(`../${fileName}`, import.meta.url), 'utf8');
  return vm.runInNewContext(`(${extractConstObject(source, constName)})`);
}

function examDataNodes() {
  const source = readFileSync(new URL('../exam-data.js', import.meta.url), 'utf8');
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.NODES;
}

function assertBookkeeperHasNoConstitution(laws, label) {
  assert.ok(Array.isArray(laws), `${label} bookkeeper laws should be an array`);
  assert.ok(laws.length > 0, `${label} bookkeeper laws should not be empty`);
  const unexpected = laws.filter((law) => CONSTITUTION_LAWS.has(law) || /憲法/.test(law));
  assert.equal(
    unexpected.length,
    0,
    `${label} bookkeeper scope must not include constitution laws: ${unexpected.join(', ')}`,
  );
}

test('exam-data bookkeeper node does not include constitution laws', () => {
  const nodes = examDataNodes();
  const bookkeeper = Object.values(nodes).find((node) => node.name === '記帳士');
  assert.ok(bookkeeper, 'exam-data should include the 記帳士 node');
  assertBookkeeperHasNoConstitution(bookkeeper.laws, 'exam-data');
});

test('web exam scopes keep bookkeeper separate from constitution subjects', () => {
  const surfaces = [
    ['fill.html', '_EXAM_LAWS'],
    ['quiz.html', '_EXAM_LAWS'],
    ['practice.html', '_EXAM_LAWS'],
    ['room.html', '_ROOM_EXAM_LAWS'],
  ];

  for (const [fileName, constName] of surfaces) {
    const laws = htmlExamLaws(fileName, constName).bookkeeper;
    assertBookkeeperHasNoConstitution(laws, fileName);
  }
});
