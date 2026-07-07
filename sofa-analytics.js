(function(){
  const ATTR_KEY = 'sofa_attribution_v1';
  const SESSION_KEY = 'sofa_session_v1';
  const TRACKING_VERSION = '20260704-revenue-v1';
  const FUNNEL_ENDPOINT = 'https://sofa-engine-api.onrender.com/api/funnel-event';
  const ATTR_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid'];
  const SERVER_EVENT_MAP = new Map([
    ['landing_view', 'landing_view'],
    ['free_practice_start', 'free_practice_start'],
    ['free_mode_select', 'free_mode_select'],
    ['quiz_start', 'quiz_start'],
    ['post_answer_value_viewed', 'post_answer_value_viewed'],
    ['pricing_view', 'pricing_view'],
    ['pricing_select_plan', 'pricing_select_plan'],
    ['pricing_free_quiz_click', 'pricing_free_quiz_click'],
    ['checkout_start', 'checkout_start'],
    ['checkout_form_visible', 'checkout_form_visible'],
    ['checkout_cta_viewed', 'checkout_cta_viewed'],
    ['checkout_email_focus', 'checkout_email_focus'],
    ['checkout_invalid_email', 'checkout_invalid_email'],
    ['checkout_exam_target_changed', 'checkout_exam_target_changed'],
    ['checkout_exam_target_select', 'checkout_exam_target_select'],
    ['checkout_exam_target_missing', 'checkout_exam_target_missing'],
    ['checkout_exam_target_unavailable', 'checkout_exam_target_unavailable'],
    ['checkout_attempt', 'checkout_attempt'],
    ['checkout_submit', 'checkout_submit'],
    ['checkout_api_error', 'checkout_api_error'],
    ['payment_return_success', 'payment_return_success'],
    ['expire_feedback_click', 'expiry_feedback_start'],
    ['expire_share_click', 'share_extension_start'],
    ['expire_renew_click', 'pricing_select_plan'],
    ['post_answer_pricing_click', 'post_answer_pricing_click'],
    ['post_answer_login_click', 'post_answer_login_click'],
    ['locked_content_pricing_click', 'locked_content_pricing_click'],
    ['existing_serial_login_click', 'existing_serial_login_click'],
    ['serial_verify_success', 'serial_verify_success']
  ]);
  const CARRY_PATHS = new Set([
    '/pricing.html','/checkout.html','/login.html','/quiz.html','/fill.html',
    '/practice.html','/dashboard.html','/free.html'
  ]);
  const MONETIZATION_PATHS = new Set(['/pricing.html','/checkout.html','/login.html']);

  function nowIso(){
    try { return new Date().toISOString(); } catch(e) { return ''; }
  }

  function params(){
    try { return new URLSearchParams(window.location.search || ''); }
    catch(e) { return new URLSearchParams(); }
  }

  function readStored(){
    try { return JSON.parse(localStorage.getItem(ATTR_KEY) || '{}') || {}; }
    catch(e) { return {}; }
  }

  function sessionId(){
    try {
      let id = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY) || '';
      if (!id) {
        const raw = (window.crypto && window.crypto.randomUUID)
          ? window.crypto.randomUUID()
          : String(Date.now()) + '-' + Math.random().toString(16).slice(2);
        id = 'web-' + raw;
        sessionStorage.setItem(SESSION_KEY, id);
        localStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch(e) {
      return '';
    }
  }

  function captureAttribution(){
    const qs = params();
    const next = {};
    ATTR_KEYS.forEach(k => {
      const v = (qs.get(k) || '').trim();
      if (v) next[k] = v;
    });
    if (!Object.keys(next).length) return readStored();
    const stored = readStored();
    const merged = Object.assign({}, stored, next, {
      landing_path: stored.landing_path || (location.pathname + location.search),
      captured_at: stored.captured_at || nowIso(),
      last_touch_path: location.pathname + location.search,
      last_touch_at: nowIso()
    });
    try { localStorage.setItem(ATTR_KEY, JSON.stringify(merged)); } catch(e) {}
    return merged;
  }

  function attributionPayload(){
    const a = readStored();
    const out = {};
    ATTR_KEYS.forEach(k => { if (a[k]) out[k] = a[k]; });
    if (a.landing_path) out.landing_path = a.landing_path;
    if (a.last_touch_path) out.last_touch_path = a.last_touch_path;
    return out;
  }

  function normalizePayload(data){
    const payload = Object.assign({
      page_path: location.pathname,
      page_title: document.title || '',
      entry_surface: currentEntrySurface(),
      tracking_version: TRACKING_VERSION
    }, attributionPayload(), data || {});
    Object.keys(payload).forEach(k => {
      if (payload[k] === undefined || payload[k] === null || payload[k] === '') delete payload[k];
    });
    return payload;
  }

  function postServerFunnel(name, payload){
    const mapped = SERVER_EVENT_MAP.get(name);
    if (!mapped) return;
    const body = JSON.stringify({
      event_name: mapped,
      session_id: sessionId(),
      plan: payload.plan || '',
      page_path: payload.page_path || location.pathname,
      page_title: payload.page_title || document.title || '',
      referrer: document.referrer || '',
      attribution: attributionPayload(),
      payload
    });
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(FUNNEL_ENDPOINT, blob)) return;
      }
    } catch(e) {}
    try {
      fetch(FUNNEL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true
      }).catch(() => {});
    } catch(e) {}
  }

  function track(name, data){
    if (!name) return;
    const payload = normalizePayload(data);
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, payload);
      } else {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(Object.assign({ event: name }, payload));
      }
    } catch(e) {}
    postServerFunnel(name, payload);
  }

  function decorateHref(href){
    let url;
    try { url = new URL(href, location.href); } catch(e) { return href; }
    if (url.origin !== location.origin) return href;
    if (!CARRY_PATHS.has(url.pathname)) return href;
    const a = readStored();
    const hasStoredAttribution = ATTR_KEYS.some(k => !!a[k]);
    ATTR_KEYS.forEach(k => {
      if (a[k] && !url.searchParams.has(k)) url.searchParams.set(k, a[k]);
    });
    if (!hasStoredAttribution && MONETIZATION_PATHS.has(url.pathname)) {
      if (!url.searchParams.has('utm_source')) url.searchParams.set('utm_source', 'site');
      if (!url.searchParams.has('utm_medium')) url.searchParams.set('utm_medium', 'internal');
      if (!url.searchParams.has('utm_campaign')) url.searchParams.set('utm_campaign', fallbackCampaign(url.pathname));
      if (!url.searchParams.has('utm_content')) url.searchParams.set('utm_content', fallbackContent());
    }
    return url.pathname + url.search + url.hash;
  }

  function fallbackCampaign(pathname){
    if (pathname === '/checkout.html') return 'checkout_entry';
    if (pathname === '/login.html') return 'serial_login';
    return 'pricing_entry';
  }

  function fallbackContent(){
    const path = (location.pathname || '/').replace(/^\/+|\.html$/g, '').replace(/[^\w-]+/g, '_');
    return path || 'home';
  }

  function currentEntrySurface(){
    const qs = params();
    const stored = readStored();
    return (
      qs.get('utm_medium') ||
      qs.get('utm_source') ||
      stored.utm_medium ||
      stored.utm_source ||
      fallbackContent()
    );
  }

  function safeDestinationPath(href){
    if (!href) return '';
    try {
      const url = new URL(href, location.href);
      ['email','serial','token','code'].forEach(k => url.searchParams.delete(k));
      if (url.origin !== location.origin) return url.origin + url.pathname;
      return url.pathname + url.search + url.hash;
    } catch(e) {
      return '';
    }
  }

  function inferEntrySurface(target, destinationPath){
    const explicit = (target.getAttribute('data-entry-surface') || '').trim();
    if (explicit) return explicit;
    if (target.closest && target.closest('#post-answer-retention')) return 'post_answer_card';
    try {
      const url = new URL(destinationPath || target.getAttribute('href') || '', location.href);
      const medium = url.searchParams.get('utm_medium');
      const source = url.searchParams.get('utm_source');
      if (medium) return medium;
      if (source) return source;
    } catch(e) {}
    return currentEntrySurface();
  }

  function decorateLinks(){
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      const next = decorateHref(href);
      if (next !== href) a.setAttribute('href', next);
    });
  }

  function queryPlan(){
    return (params().get('plan') || '').trim();
  }

  window.sofaTrack = track;
  window.sofaGetAttribution = attributionPayload;
  window.sofaGetSessionId = sessionId;
  window.sofaDecorateHref = decorateHref;
  window.sofaAttribution = {
    capture: captureAttribution,
    decorateLinks: decorateLinks,
    payload: attributionPayload,
    sessionId: sessionId
  };

  captureAttribution();

  document.addEventListener('click', ev => {
    const target = ev.target && ev.target.closest ? ev.target.closest('[data-track-event]') : null;
    if (!target) return;
    const label = target.getAttribute('data-track-label') || target.textContent.trim().slice(0, 80);
    const destinationPath = safeDestinationPath(target.getAttribute('href') || '');
    track(target.getAttribute('data-track-event'), {
      track_label: label,
      cta_id: label,
      entry_surface: inferEntrySurface(target, destinationPath),
      destination_path: destinationPath,
      plan: target.getAttribute('data-plan') || queryPlan()
    });
  });

  document.addEventListener('DOMContentLoaded', () => {
    decorateLinks();
    const path = location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/' || path.endsWith('/index.html')) track('landing_view');
    if (path.endsWith('/pricing.html')) track('pricing_view');
    if (path.endsWith('/checkout.html')) track('checkout_start', { plan: queryPlan() || '到考日' });
    const qs = params();
    const success = ['paid','success'].some(k => qs.get(k) === '1') || /success|paid|completed/i.test(qs.get('status') || qs.get('payment') || '');
    // URL return params only prove the browser came back from payment; verified revenue is server-side only.
    if (success) track('payment_return_success', { plan: queryPlan() });
  });
})();
