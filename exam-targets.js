(function(){
  'use strict';

  const DEFAULT_EXAM_DAY_REGISTRATION_LEAD_LABEL = '報名前一個月';
  const OFFICIAL_SOURCE = {
    label: '考選部 115 年建築師、技師、不動產經紀人及記帳士考試',
    url: 'https://wwwc.moex.gov.tw/main/Exam/wFrmExamDetail.aspx?c=115180',
    detailUrl: 'https://wwwc.moex.gov.tw/Main/exam/wFrmPropertyDetail.aspx?c=115180&m=7987',
    checkedAt: '2026-09-08',
    groupStart: '2026-11-14',
    groupEnd: '2026-11-16'
  };
  const TARGET_ALIASES = {
    realestate: 'real_estate_broker',
    'real-estate': 'real_estate_broker',
    real_estate: 'real_estate_broker',
    n83: 'real_estate_broker'
  };
  const API_KEY_ALIASES = { real_estate_broker: 'realestate' };
  const TARGETS = {
    bookkeeper: {
      key: 'bookkeeper', label: '記帳士',
      examDate: '2026-11-14T00:00:00+08:00',
      examEndDate: '2026-11-15T23:59:59+08:00',
      examDisplay: '2026 / 11 / 14–11 / 15',
      registrationStart: '2026-08-04T00:00:00+08:00',
      registrationEnd: '2026-08-13T17:00:00+08:00',
      registrationDisplay: '2026 / 08 / 04–08 / 13',
      saleOpenDate: '2026-07-04T00:00:00+08:00',
      verificationStatus: 'verified', verificationLabel: '已確認',
      sourceLabel: OFFICIAL_SOURCE.label, sourceUrl: OFFICIAL_SOURCE.detailUrl,
      checkedAt: OFFICIAL_SOURCE.checkedAt,
      lineBotSupported: true, laws: '33', articles: '2,157',
      highlight: '營利事業所得稅查核準則 143 條（記帳士獨家）',
      subjects: [
        { key:'chinese_composition', label:'國文（作文）' },
        { key:'accounting', label:'會計學概要' },
        { key:'tax_filing_practice', label:'租稅申報實務' },
        { key:'tax_laws', label:'稅務相關法規概要' },
        { key:'bookkeeping_laws', label:'記帳相關法規概要' }
      ]
    },
    real_estate_broker: {
      key: 'real_estate_broker', label: '不動產經紀人',
      examDate: '2026-11-14T00:00:00+08:00',
      examEndDate: '2026-11-15T23:59:59+08:00',
      examDisplay: '2026 / 11 / 14–11 / 15',
      registrationStart: '2026-08-04T00:00:00+08:00',
      registrationEnd: '2026-08-13T17:00:00+08:00',
      registrationDisplay: '2026 / 08 / 04–08 / 13',
      saleOpenDate: '2026-07-04T00:00:00+08:00',
      verificationStatus: 'verified', verificationLabel: '已確認',
      sourceLabel: OFFICIAL_SOURCE.label, sourceUrl: OFFICIAL_SOURCE.detailUrl,
      checkedAt: OFFICIAL_SOURCE.checkedAt,
      lineBotSupported: true, laws: '19', articles: '3,058',
      highlight: '民法 / 土地法 / 不動產經紀業管理條例',
      subjects: [
        { key:'chinese_composition', label:'國文（作文）' },
        { key:'civil_law', label:'民法概要' },
        { key:'real_estate_valuation', label:'不動產估價概要' },
        { key:'land_law_and_tax', label:'土地法與土地相關稅法概要' },
        { key:'broker_regulations', label:'不動產經紀相關法規概要' }
      ]
    },
    landadmin: unverified('landadmin', '地政士', '23', '3,650', '民法 1,439 / 地籍測量規則 324 / 土地登記規則 184'),
    'tax-admin': unverified('tax-admin', '財稅行政（高普考）', '20', '2,590', '貨物稅 / 印花稅 / 使用牌照稅 三細節稅法'),
    'tax-law': unverified('tax-law', '財稅法務（高考三級）', '19', '3,439', '民法 + 刑法 + 行政訴訟法 + 全套稅法'),
    'elem-admin': Object.assign(unverified('elem-admin', '初等一般行政', '11', '2,886', '公務員入門八大法 + 民刑法基底'), {
      purchaseStatus:'disabled', purchaseNote:'LINE 推播尚未支援完整服務，暫不開放到考日方案。', lineBotSupported:false
    }),
    'post-acc': unverified('post-acc', '中華郵政會計類', '10', '1,349', '公司法 / 會計法 / 預算法 / 決算法 / 郵政法')
  };

  function unverified(key, label, laws, articles, highlight){
    return { key, label, examDisplay:'未確認', verificationStatus:'unverified', verificationLabel:'未確認', checkedAt:OFFICIAL_SOURCE.checkedAt, lineBotSupported:true, laws, articles, highlight, subjects:[] };
  }
  function normalizeTargetKey(value){
    const raw = String(value || '').trim();
    return TARGET_ALIASES[raw] || raw;
  }
  function toApiKey(value){
    const key = normalizeTargetKey(value);
    return API_KEY_ALIASES[key] || key;
  }
  function getTarget(value){ return TARGETS[normalizeTargetKey(value)] || null; }
  function getSearchTarget(){
    try{
      const params = new URLSearchParams(window.location.search);
      return params.get('target') || params.get('exam_target') || params.get('exam') || '';
    }catch(e){ return ''; }
  }
  function readStoredTarget(){
    try{
      return normalizeTargetKey(localStorage.getItem('sofa_exam_target') || localStorage.getItem('sofa_exam_key') || localStorage.getItem('sofa.target') || localStorage.getItem('sofa.dash.exam.pick') || '');
    }catch(e){ return ''; }
  }
  function writeStoredTarget(value){
    const key = normalizeTargetKey(value);
    if(!TARGETS[key]) return '';
    try{
      ['sofa_exam_target','sofa_exam_key','sofa.target','sofa.dash.exam.pick'].forEach(name => localStorage.setItem(name, key));
    }catch(e){}
    return key;
  }
  function emit(name, detail){
    try{ window.dispatchEvent(new CustomEvent(name, { detail })); }catch(e){}
  }
  function selectTarget(value){
    const key = writeStoredTarget(value);
    if(!key) return UNKNOWN_TARGET;
    const target = TARGETS[key];
    const currentSubject = resolveSubject(target);
    if(!currentSubject && target.subjects.length) writeStoredSubject(target.subjects[0].key);
    emit('sofa:exam-target-changed', { key, target });
    return target;
  }
  const UNKNOWN_TARGET = {
    key:'', label:'目標考試', examDisplay:'未確認', verificationStatus:'unverified', verificationLabel:'未確認', checkedAt:OFFICIAL_SOURCE.checkedAt,
    laws:'—', articles:'—', highlight:'先選你的考試目標，倒數才會開始計算。', subjects:[]
  };
  function resolveTarget(){
    const fromUrl = normalizeTargetKey(getSearchTarget());
    if(fromUrl && TARGETS[fromUrl]) return selectTarget(fromUrl);
    const stored = readStoredTarget();
    return stored && TARGETS[stored] ? TARGETS[stored] : UNKNOWN_TARGET;
  }
  function hasExamDate(target){ return !!(target && target.examDate && target.examEndDate && target.examDisplay); }
  function hasRegistrationWindow(target){ return !!(target && target.registrationStart && target.registrationDisplay && target.saleOpenDate); }
  function rawDaysUntil(target, now){
    const t = typeof target === 'string' ? getTarget(target) : (target || resolveTarget());
    if(!hasExamDate(t)) return null;
    return Math.ceil((new Date(t.examDate) - (now ? new Date(now) : new Date())) / 86400000);
  }
  function daysUntil(target, now){ const raw = rawDaysUntil(target, now); return raw === null ? null : Math.max(raw, 0); }
  function isExpired(target, now){
    const t = typeof target === 'string' ? getTarget(target) : target;
    return hasExamDate(t) && new Date(t.examEndDate) < (now ? new Date(now) : new Date());
  }
  function listAvailable(now){
    return Object.keys(TARGETS).map(key => TARGETS[key]).filter(target => hasExamDate(target) && !isExpired(target, now));
  }
  function rawDaysUntilRegistration(target, now){
    const t = target || resolveTarget(); if(!hasRegistrationWindow(t)) return null;
    return Math.ceil((new Date(t.registrationStart) - (now ? new Date(now) : new Date())) / 86400000);
  }
  function rawDaysUntilSaleOpen(target, now){
    const t = target || resolveTarget(); if(!hasRegistrationWindow(t)) return null;
    return Math.ceil((new Date(t.saleOpenDate) - (now ? new Date(now) : new Date())) / 86400000);
  }
  function examDayPlanState(target, now){
    const t = target || resolveTarget();
    if(!t || !t.key) return {state:'missing_target',canBuy:false,reason:'請先選你的考試目標。'};
    if(t.purchaseStatus === 'disabled') return {state:'purchase_disabled',canBuy:false,reason:t.purchaseNote || '這個考試暫不開放到考日方案。'};
    if(t.lineBotSupported !== true) return {state:'line_unsupported',canBuy:false,reason:'LINE 端尚未支援完整內容，暫不開放到考日方案。'};
    if(!hasExamDate(t)) return {state:'unconfigured',canBuy:false,reason:'考期未確認，暫不開放到考日方案。'};
    if(isExpired(t, now)) return {state:'closed',canBuy:false,daysUntil:rawDaysUntil(t,now),reason:'這個考期已結束。'};
    if(!hasRegistrationWindow(t)) return {state:'unconfigured',canBuy:false,reason:'正式報名日未確認，暫不開放到考日方案。'};
    const daysUntilSaleOpen = rawDaysUntilSaleOpen(t, now);
    const daysUntilRegistration = rawDaysUntilRegistration(t, now);
    if(daysUntilSaleOpen > 0) return {state:'not_open',canBuy:false,daysUntil:daysUntil(t,now),daysUntilRegistration,daysUntilSaleOpen,saleOpenDate:t.saleOpenDate,reason:`還有 ${daysUntilSaleOpen} 天，${DEFAULT_EXAM_DAY_REGISTRATION_LEAD_LABEL}才開放到考日方案。`};
    return {state:'open',canBuy:true,daysUntil:daysUntil(t,now),daysUntilRegistration,saleOpenDate:t.saleOpenDate,reason:`已進入${DEFAULT_EXAM_DAY_REGISTRATION_LEAD_LABEL}窗口。`};
  }
  function normalizeSubjectKey(value, target){
    const raw = String(value || '').trim();
    const t = typeof target === 'string' ? getTarget(target) : (target || resolveTarget());
    const found = (t.subjects || []).find(subject => subject.key === raw || subject.label === raw);
    return found ? found.key : '';
  }
  function writeStoredSubject(value){
    try{ localStorage.setItem('sofa_exam_subject', String(value || '')); }catch(e){}
  }
  function resolveSubject(target){
    const t = typeof target === 'string' ? getTarget(target) : (target || resolveTarget());
    let stored = ''; try{ stored = localStorage.getItem('sofa_exam_subject') || ''; }catch(e){}
    const key = normalizeSubjectKey(stored, t);
    return (t.subjects || []).find(subject => subject.key === key) || null;
  }
  function selectSubject(value, target){
    const t = typeof target === 'string' ? getTarget(target) : (target || resolveTarget());
    const key = normalizeSubjectKey(value, t);
    const subject = (t.subjects || []).find(item => item.key === key) || null;
    if(!subject) return null;
    writeStoredSubject(subject.key);
    emit('sofa:exam-subject-changed', { targetKey:t.key, subjectKey:subject.key, subject });
    return subject;
  }
  function textForDays(target, suffix){ const d = daysUntil(target); return d === null ? '未確認' : String(d) + (suffix || ''); }
  function renderCountdown(options){
    const target = resolveTarget(); const opts = options || {}; const d = daysUntil(target);
    const all = selector => selector ? document.querySelectorAll(selector) : [];
    all(opts.days).forEach(el => { el.textContent = d === null ? (opts.emptyDaysText || '—') : String(d) + (opts.daysSuffix || ''); });
    all(opts.date).forEach(el => { el.textContent = target.examDisplay || '未確認'; });
    all(opts.label).forEach(el => { el.textContent = target.label || '目標考試'; });
    all(opts.source).forEach(el => { el.textContent = target.sourceLabel ? `${target.sourceLabel} · 查核 ${target.checkedAt}` : `來源未確認 · 查核 ${target.checkedAt}`; });
    all(opts.bar).forEach(el => { el.textContent = hasExamDate(target) ? `${target.examDisplay}  ${target.label}考試` : `${target.label} · 未確認`; });
    all(opts.days).forEach(el => { el.title = target.sourceLabel ? `${target.sourceLabel}；查核 ${target.checkedAt}` : `來源未確認；查核 ${target.checkedAt}`; });
    return target;
  }

  window.SoFaExamTargets = { TARGETS, TARGET_ALIASES, OFFICIAL_SOURCE, UNKNOWN_TARGET, DEFAULT_EXAM_DAY_REGISTRATION_LEAD_LABEL, normalizeTargetKey, toApiKey, getTarget, resolveTarget, selectTarget, hasExamDate, hasRegistrationWindow, isExpired, listAvailable, daysUntil, rawDaysUntil, rawDaysUntilRegistration, rawDaysUntilSaleOpen, examDayPlanState, normalizeSubjectKey, resolveSubject, selectSubject, textForDays, renderCountdown };
})();
