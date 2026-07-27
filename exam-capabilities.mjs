export const EXAM_CAPABILITIES = Object.freeze({
  bookkeeper: Object.freeze({
    label: '記帳士',
    legacyNodeId: 'n72',
    subjects: Object.freeze({
      '會計學概要': Object.freeze({mode: 'accounting_mcq', availability: 'internal_review'}),
      '記帳相關法規概要': Object.freeze({mode: 'law_mcq', availability: 'live'}),
      '租稅申報實務': Object.freeze({mode: 'essay', availability: 'hidden'}),
      '稅務相關法規概要': Object.freeze({mode: 'law_mcq', availability: 'live'}),
      '國文（作文）': Object.freeze({mode: 'composition', availability: 'hidden'}),
    }),
  }),
  real_estate_broker: Object.freeze({
    label: '不動產經紀人',
    legacyNodeId: 'n83',
    subjects: Object.freeze({
      '民法概要': Object.freeze({mode: 'law_mcq', availability: 'not_live'}),
      '不動產經紀相關法規概要': Object.freeze({mode: 'law_mcq', availability: 'not_live'}),
      '土地法與土地相關稅法概要': Object.freeze({mode: 'law_mcq', availability: 'not_live'}),
    }),
  }),
  land_agent: Object.freeze({
    label: '地政士',
    legacyNodeId: 'n74',
    subjects: Object.freeze({}),
  }),
});

const EXAM_KEY_ALIASES = Object.freeze({
  n72: 'bookkeeper',
  realestate: 'real_estate_broker',
  'real-estate': 'real_estate_broker',
  real_estate: 'real_estate_broker',
  n83: 'real_estate_broker',
  landadmin: 'land_agent',
  'land-agent': 'land_agent',
  'land-admin': 'land_agent',
  land_admin: 'land_agent',
  n74: 'land_agent',
});

function knownExamKey(value) {
  const raw = String(value || '').trim();
  const key = EXAM_KEY_ALIASES[raw] || raw;
  return Object.hasOwn(EXAM_CAPABILITIES, key) ? key : '';
}

export function resolveExamKey({
  profileExamKey = '',
  urlExamKey = '',
  storedExamKey = '',
} = {}) {
  return knownExamKey(profileExamKey)
    || knownExamKey(urlExamKey)
    || knownExamKey(storedExamKey);
}

export async function resolveExamKeyWithProfile({
  authenticated = false,
  loadProfileExamKey,
  urlExamKey = '',
  storedExamKey = '',
} = {}) {
  if (!authenticated) {
    return {
      examKey: resolveExamKey({urlExamKey, storedExamKey}),
      profileState: 'not_required',
    };
  }
  try {
    const profileExamKey = await loadProfileExamKey();
    return {
      examKey: resolveExamKey({profileExamKey, urlExamKey, storedExamKey}),
      profileState: 'resolved',
    };
  } catch {
    return {examKey: '', profileState: 'failed'};
  }
}

export function subjectsForExam(examKey, {includeInternal = false} = {}) {
  const exam = EXAM_CAPABILITIES[knownExamKey(examKey)];
  if (!exam) return [];
  return Object.entries(exam.subjects)
    .filter(([, capability]) => capability.availability === 'live'
      || (includeInternal && capability.availability === 'internal_review'))
    .map(([subject]) => subject);
}
