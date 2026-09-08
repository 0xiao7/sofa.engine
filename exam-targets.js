(function (global) {
  'use strict';

  const DEFAULT_EXAM_DAY_REGISTRATION_LEAD_LABEL = '報名前一個月';
  const META = Object.freeze({
    version: "2026-09-08-canonical-schedule-v1",
    timezone: "Asia/Taipei",
    officialCheckedAt: "2026-09-08",
    officialSourceUrl: "https://wwwc.moex.gov.tw/main/Exam/wFrmExamDetail.aspx?c=115180",
    officialDetailUrl: "https://wwwc.moex.gov.tw/main/exam/wFrmPropertyDetail.aspx?c=115180&m=7987",
    eventWindow: Object.freeze({"start":"2026-11-14","end":"2026-11-16"})
  });

  const TARGETS = Object.freeze({
    "bookkeeper": Object.freeze({
      key: "bookkeeper",
      label: "記帳士",
      shortLabel: "記帳士",
      examDate: "2026-11-14T00:00:00+08:00",
      examEndDate: "2026-11-15T23:59:59+08:00",
      examDisplay: "2026 / 11 / 14",
      registrationStart: "2026-08-04T00:00:00+08:00",
      registrationEnd: "2026-08-13T23:59:59+08:00",
      registrationDisplay: "2026 / 08 / 04",
      saleOpenDate: "2026-07-04T00:00:00+08:00",
      accessUntil: "2026-11-21T23:59:59+08:00",
      lineBotSupported: true,
      purchaseStatus: "open",
      unavailableReason: ""
    }),
    "landadmin": Object.freeze({
      key: "landadmin",
      label: "地政士",
      shortLabel: "地政士",
      examDate: "",
      examEndDate: "",
      examDisplay: "下一期未公告",
      registrationStart: "",
      registrationEnd: "",
      registrationDisplay: "下一期未公告",
      saleOpenDate: "",
      accessUntil: "",
      lineBotSupported: true,
      purchaseStatus: "unconfigured",
      unavailableReason: ""
    }),
    "tax-admin": Object.freeze({
      key: "tax-admin",
      label: "財稅行政（高普考）",
      shortLabel: "財稅行政（高普考）",
      examDate: "",
      examEndDate: "",
      examDisplay: "下一期未公告",
      registrationStart: "",
      registrationEnd: "",
      registrationDisplay: "下一期未公告",
      saleOpenDate: "",
      accessUntil: "",
      lineBotSupported: true,
      purchaseStatus: "unconfigured",
      unavailableReason: ""
    }),
    "tax-law": Object.freeze({
      key: "tax-law",
      label: "財稅法務（高考三級）",
      shortLabel: "財稅法務（高考三級）",
      examDate: "",
      examEndDate: "",
      examDisplay: "下一期未公告",
      registrationStart: "",
      registrationEnd: "",
      registrationDisplay: "下一期未公告",
      saleOpenDate: "",
      accessUntil: "",
      lineBotSupported: true,
      purchaseStatus: "unconfigured",
      unavailableReason: ""
    }),
    "elem-admin": Object.freeze({
      key: "elem-admin",
      label: "初等一般行政",
      shortLabel: "初等一般行政",
      examDate: "",
      examEndDate: "",
      examDisplay: "下一期未公告",
      registrationStart: "",
      registrationEnd: "",
      registrationDisplay: "下一期未公告",
      saleOpenDate: "",
      accessUntil: "",
      lineBotSupported: false,
      purchaseStatus: "disabled",
      unavailableReason: "LINE 推播尚未支援完整服務"
    }),
    "post-acc": Object.freeze({
      key: "post-acc",
      label: "中華郵政會計類",
      shortLabel: "中華郵政會計類",
      examDate: "",
      examEndDate: "",
      examDisplay: "下一期未公告",
      registrationStart: "",
      registrationEnd: "",
      registrationDisplay: "下一期未公告",
      saleOpenDate: "",
      accessUntil: "",
      lineBotSupported: true,
      purchaseStatus: "unconfigured",
      unavailableReason: ""
    }),
    "real_estate_broker": Object.freeze({
      key: "real_estate_broker",
      label: "不動產經紀人",
      shortLabel: "不動產經紀人",
      examDate: "2026-11-14T00:00:00+08:00",
      examEndDate: "2026-11-15T23:59:59+08:00",
      examDisplay: "2026 / 11 / 14",
      registrationStart: "2026-08-04T00:00:00+08:00",
      registrationEnd: "2026-08-13T23:59:59+08:00",
      registrationDisplay: "2026 / 08 / 04",
      saleOpenDate: "2026-07-04T00:00:00+08:00",
      accessUntil: "2026-12-14T23:59:59+08:00",
      lineBotSupported: true,
      purchaseStatus: "open",
      unavailableReason: ""
    })
  });

  const ALIASES = Object.freeze({
    bookkeeper: 'bookkeeper',
    real_estate_broker: 'real_estate_broker',
    realestate: 'real_estate_broker',
    'real-estate': 'real_estate_broker',
    'real-estate-broker': 'real_estate_broker',
    real_estate: 'real_estate_broker',
    n83: 'real_estate_broker'
  });

  function normalizeKey(value) {
    const raw = String(value || '').trim().toLowerCase();
    return ALIASES[raw] || (TARGETS[raw] ? raw : 'bookkeeper');
  }

  function getSearchTarget() {
    try { return new URLSearchParams(global.location.search || '').get('exam'); }
    catch (_) { return ''; }
  }

  function readStoredTarget() {
    try {
      return global.localStorage.getItem('sofa_exam_key') ||
        global.localStorage.getItem('sofa_exam_target') ||
        global.localStorage.getItem('sofa.target') || '';
    } catch (_) { return ''; }
  }

  function resolveTarget(value) {
    return TARGETS[normalizeKey(value || getSearchTarget() || readStoredTarget())] || TARGETS.bookkeeper;
  }

  function rawDaysUntil(target, now) {
    const item = typeof target === 'string' ? resolveTarget(target) : (target || resolveTarget());
    if (!item || !item.examDate) return null;
    const current = now instanceof Date ? now : new Date(now || Date.now());
    return Math.ceil((new Date(item.examDate).getTime() - current.getTime()) / 86400000);
  }

  function daysUntil(target, now) {
    const raw = rawDaysUntil(target, now);
    return raw === null ? null : Math.max(0, raw);
  }

  function activeTargets(now) {
    const current = now instanceof Date ? now : new Date(now || Date.now());
    return Object.keys(TARGETS).map(key => TARGETS[key]).filter(target =>
      target.examDate && current.getTime() <= new Date(target.examEndDate || target.examDate).getTime()
    );
  }

  function examDayPlanState(target, now) {
    const item = typeof target === 'string' ? resolveTarget(target) : target;
    const current = now instanceof Date ? now : new Date(now || Date.now());
    if (!item) return { state: 'missing', canBuy: false, reason: '請先選考試目標' };
    if (item.purchaseStatus === 'disabled' || item.lineBotSupported !== true) {
      return { state: 'purchase_disabled', canBuy: false, reason: item.unavailableReason || 'LINE 推播尚未支援完整服務' };
    }
    if (!item.examDate) return { state: 'date_unannounced', canBuy: false, reason: '下一期考試日尚未公告' };
    if (item.saleOpenDate && current < new Date(item.saleOpenDate)) {
      return { state: 'not_open', canBuy: false, reason: DEFAULT_EXAM_DAY_REGISTRATION_LEAD_LABEL + '開放購買' };
    }
    if (item.accessUntil && current > new Date(item.accessUntil)) {
      return { state: 'expired', canBuy: false, reason: '本期考試已結束' };
    }
    return { state: 'active', canBuy: true, reason: DEFAULT_EXAM_DAY_REGISTRATION_LEAD_LABEL + '起開放，使用到考後緩衝日' };
  }

  function sourceLabel() {
    return '考選部｜' + META.officialCheckedAt + ' 查核';
  }

  function renderCountdown(root, target) {
    const scope = root && root.querySelectorAll ? root : global.document;
    const item = resolveTarget(target);
    if (!scope) return item;
    const active = activeTargets();
    const remaining = active.some(candidate => candidate.key === item.key) ? daysUntil(item) : null;
    Array.from(scope.querySelectorAll('[data-exam-days]')).forEach(node => { node.textContent = remaining === null ? '待公告' : String(remaining); });
    Array.from(scope.querySelectorAll('[data-exam-label]')).forEach(node => { node.textContent = item.label; });
    Array.from(scope.querySelectorAll('[data-exam-date]')).forEach(node => { node.textContent = item.examDisplay; });
    Array.from(scope.querySelectorAll('[data-exam-source]')).forEach(node => {
      node.textContent = sourceLabel();
      if (node.tagName === 'A') node.href = META.officialSourceUrl;
    });
    return item;
  }

  global.SoFaExamTargets = Object.freeze({
    META,
    TARGETS,
    ALIASES,
    DEFAULT_EXAM_DAY_REGISTRATION_LEAD_LABEL,
    normalizeKey,
    resolveTarget,
    rawDaysUntil,
    daysUntil,
    activeTargets,
    examDayPlanState,
    sourceLabel,
    renderCountdown
  });
})(typeof window !== 'undefined' ? window : globalThis);
