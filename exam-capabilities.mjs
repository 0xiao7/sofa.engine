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
      '民法概要': Object.freeze({mode: 'law_mcq', availability: 'live'}),
      '不動產經紀相關法規概要': Object.freeze({mode: 'law_mcq', availability: 'live'}),
      '土地法與土地相關稅法概要': Object.freeze({mode: 'law_mcq', availability: 'live'}),
    }),
  }),
  land_agent: Object.freeze({
    label: '地政士',
    legacyNodeId: 'n75',
    subjects: Object.freeze({}),
  }),
});

function knownExamKey(value) {
  const key = String(value || '').trim();
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

export function subjectsForExam(examKey, {includeInternal = false} = {}) {
  const exam = EXAM_CAPABILITIES[knownExamKey(examKey)];
  if (!exam) return [];
  return Object.entries(exam.subjects)
    .filter(([, capability]) => capability.availability === 'live'
      || (includeInternal && capability.availability === 'internal_review'))
    .map(([subject]) => subject);
}
