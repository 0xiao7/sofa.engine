import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXAM_CAPABILITIES,
  resolveExamKey,
  resolveExamKeyWithProfile,
  subjectsForExam,
} from '../exam-capabilities.mjs';

test('profile exam wins over URL and stored exam', () => {
  assert.equal(resolveExamKey({
    profileExamKey: 'bookkeeper',
    urlExamKey: 'real_estate_broker',
    storedExamKey: 'land_agent',
  }), 'bookkeeper');
});

test('URL exam wins when profile has no exam', () => {
  assert.equal(resolveExamKey({
    urlExamKey: 'real_estate_broker',
    storedExamKey: 'bookkeeper',
  }), 'real_estate_broker');
});

test('stored exam is used only after profile and URL', () => {
  assert.equal(resolveExamKey({storedExamKey: 'land_agent'}), 'land_agent');
});

test('established exam aliases normalize to canonical keys', () => {
  for (const alias of ['bookkeeper', 'n72']) {
    assert.equal(resolveExamKey({urlExamKey: alias}), 'bookkeeper', alias);
  }
  for (const alias of ['realestate', 'real-estate', 'real_estate', 'real_estate_broker', 'n83']) {
    assert.equal(resolveExamKey({urlExamKey: alias}), 'real_estate_broker', alias);
    assert.deepEqual(subjectsForExam(alias), [], alias);
  }
  for (const alias of ['landadmin', 'land-agent', 'land_agent', 'land-admin', 'land_admin', 'n74']) {
    assert.equal(resolveExamKey({storedExamKey: alias}), 'land_agent', alias);
    assert.deepEqual(subjectsForExam(alias), [], alias);
  }
  assert.equal(EXAM_CAPABILITIES.land_agent.legacyNodeId, 'n74');
});

test('unknown or absent exam fails closed without bookkeeper fallback', () => {
  assert.equal(resolveExamKey({storedExamKey: 'mining_engineer'}), '');
  assert.equal(resolveExamKey({}), '');
  assert.deepEqual(subjectsForExam('mining_engineer'), []);
});

test('bookkeeper exposes only production-live subjects to customers', () => {
  assert.deepEqual(subjectsForExam('bookkeeper'), [
    '會計學概要',
    '記帳相關法規概要',
    '稅務相關法規概要',
  ]);
  assert.equal(EXAM_CAPABILITIES.bookkeeper.subjects['會計學概要'].availability, 'live');
  assert.equal(EXAM_CAPABILITIES.bookkeeper.subjects['租稅申報實務'].availability, 'hidden');
  assert.equal(EXAM_CAPABILITIES.bookkeeper.subjects['國文（作文）'].availability, 'hidden');
});

test('non-bookkeeper exams stay unavailable without exam-isolated production evidence', () => {
  assert.deepEqual(subjectsForExam('real_estate_broker'), []);
  assert.deepEqual(subjectsForExam('land_agent'), []);

  for (const capability of Object.values(EXAM_CAPABILITIES.real_estate_broker.subjects)) {
    assert.equal(capability.availability, 'not_live');
  }
});

for (const [label, error] of [
  ['HTTP 500', new Error('profile 500')],
  ['fetch rejection', new TypeError('Failed to fetch')],
  ['AbortError', new DOMException('aborted', 'AbortError')],
]) {
  test(`authenticated ${label} fails closed despite stale bookkeeper scope`, async () => {
    let pastExamRequests = 0;
    const result = await resolveExamKeyWithProfile({
      authenticated: true,
      loadProfileExamKey: async () => { throw error; },
      urlExamKey: 'bookkeeper',
      storedExamKey: 'bookkeeper',
    });
    if (result.examKey) pastExamRequests += 1;

    assert.deepEqual(result, {examKey: '', profileState: 'failed'});
    assert.equal(pastExamRequests, 0);
  });
}

test('delayed authenticated profile success overrides URL and storage', async () => {
  let settled = false;
  const pending = resolveExamKeyWithProfile({
    authenticated: true,
    loadProfileExamKey: async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      settled = true;
      return 'realestate';
    },
    urlExamKey: 'bookkeeper',
    storedExamKey: 'bookkeeper',
  });

  assert.equal(settled, false);
  assert.deepEqual(await pending, {
    examKey: 'real_estate_broker',
    profileState: 'resolved',
  });
});

test('resolved empty profile follows URL then storage fallback', async () => {
  assert.deepEqual(await resolveExamKeyWithProfile({
    authenticated: true,
    loadProfileExamKey: async () => '',
    urlExamKey: 'bookkeeper',
    storedExamKey: 'landadmin',
  }), {examKey: 'bookkeeper', profileState: 'resolved'});

  assert.deepEqual(await resolveExamKeyWithProfile({
    authenticated: true,
    loadProfileExamKey: async () => '',
    storedExamKey: 'landadmin',
  }), {examKey: 'land_agent', profileState: 'resolved'});
});

test('guest scope uses URL then storage without loading a profile', async () => {
  let profileLoads = 0;
  const result = await resolveExamKeyWithProfile({
    authenticated: false,
    loadProfileExamKey: async () => { profileLoads += 1; return 'realestate'; },
    urlExamKey: 'bookkeeper',
    storedExamKey: 'landadmin',
  });

  assert.deepEqual(result, {examKey: 'bookkeeper', profileState: 'not_required'});
  assert.equal(profileLoads, 0);
});
