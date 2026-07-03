import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const modelDir = path.join(root, 'models', 'v2');
const expected = [
  'desk.glb',
  'chair.glb',
  'bookcase.glb',
  'sideboard.glb',
  'pendant.glb',
  'plant.glb',
  'plant-small.glb',
];

test('room v2 has drop-in GLB assets for every hot-swap furniture slot', () => {
  for (const name of expected) {
    const file = path.join(modelDir, name);
    assert.ok(fs.existsSync(file), `${name} should exist in models/v2`);
    const data = fs.readFileSync(file);
    assert.equal(data.subarray(0, 4).toString('utf8'), 'glTF', `${name} should be a binary glTF file`);
    assert.ok(data.byteLength > 1500, `${name} should contain real mesh data, not an empty placeholder`);
  }
});
