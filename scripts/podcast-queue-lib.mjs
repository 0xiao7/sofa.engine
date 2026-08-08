const EXAMS = new Set(['記帳士', '地政士', '國考']);
const READY = 'approved_for_release';
const PRC_TERMS = ['視頻', '信息', '軟件', '賬號', '打印', '質量'];

function unique(rows, key) {
  const seen = new Set();
  for (const row of rows) {
    const value = row[key];
    if (seen.has(value)) throw new Error(`duplicate ${key}: ${value}`);
    seen.add(value);
  }
}

export function validateQueue(queue) {
  if (queue?.schemaVersion !== 1) throw new Error('unsupported queue schemaVersion');
  if (queue?.timezone !== 'Asia/Taipei') throw new Error('timezone must be Asia/Taipei');
  const rows = queue?.episodes;
  if (!Array.isArray(rows) || rows.length !== 30) throw new Error('queue must contain exactly 30 episodes');

  unique(rows, 'id');
  unique(rows, 'sourceAngle');
  unique(rows, 'articleId');
  unique(rows, 'utmCampaign');
  unique(rows, 'guid');

  rows.forEach((row, index) => {
    const expected = `EP${String(index + 7).padStart(3, '0')}`;
    if (row.id !== expected) throw new Error(`episode sequence error: expected ${expected}`);
    if (!EXAMS.has(row.exam) || !row.title.startsWith(`${row.exam}｜`)) {
      throw new Error(`${row.id} missing exam label or product-led title`);
    }
    if (!/^https:\/\/law\.moj\.gov\.tw\/LawClass\/LawSingle\.aspx\?pcode=[A-Z]\d+&flno=/.test(row.officialLawUrl)) {
      throw new Error(`${row.id} invalid officialLawUrl`);
    }
    if (!/^https:\/\/sofa-engine-api\.onrender\.com\/api\/article\/[0-9a-f-]{36}$/.test(row.sourceApi)) {
      throw new Error(`${row.id} invalid sourceApi`);
    }
    if (!/^[0-9a-f-]{36}$/.test(row.articleId) || !row.sourceApi.endsWith(row.articleId)) {
      throw new Error(`${row.id} article source mismatch`);
    }
    const text = `${row.title} ${row.summary} ${row.cta}`;
    const bad = PRC_TERMS.find(term => text.includes(term));
    if (bad) throw new Error(`${row.id} PRC wording: ${bad}`);
    if (!row.cta || row.cta.length > 30) throw new Error(`${row.id} CTA exceeds 15-second boundary`);
    if (row.status === READY) {
      for (const type of ['mp3', 'm4a', 'vtt']) {
        if (!row.assets?.[type]) throw new Error(`${row.id} approved without ${type}`);
      }
      if (row.listenApproval?.status !== 'approved' || !row.listenApproval.approvedBy || !row.listenApproval.approvedAt) {
        throw new Error(`${row.id} approved without listen approval`);
      }
      if (!/^00:\d{2}:\d{2}$/.test(row.duration || '')) throw new Error(`${row.id} approved without duration`);
      if (row.guid.endsWith('-pending')) throw new Error(`${row.id} approved with provisional GUID`);
      if (`${row.law} ${row.title} ${row.summary}`.includes('會計')) {
        const review = row.pronunciationReview;
        if (
          review?.status !== 'approved'
          || !review.reviewedBy
          || !review.reviewedAt
          || review.terms?.['會計'] !== 'ㄎㄨㄞˋ ㄐㄧˋ'
        ) {
          throw new Error(`${row.id} missing 會計 pronunciation review (ㄎㄨㄞˋ ㄐㄧˋ)`);
        }
      }
    }
  });

  return { episodes: rows.length, ready: rows.filter(row => row.status === READY).length };
}

export function taipeiDate(isoInstant) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(isoInstant));
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function selectDueEpisode(queue, isoInstant = new Date().toISOString()) {
  validateQueue(queue);
  const released = new Set(queue.episodes.filter(row => row.status === 'released').map(row => row.id));
  const head = queue.episodes.find(row => !released.has(row.id));
  if (!head || head.scheduledDate > taipeiDate(isoInstant)) return null;
  if (head.status !== READY) return null;
  return head;
}
