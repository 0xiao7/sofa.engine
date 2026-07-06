/* ===================================================================
   COMPASS WIDGET — 考運羅盤 inline 嵌入版
   依賴 window.NODES, SECTIONS, SEC_NODES, SEC_COUNTS, SEC_EMOJI (exam-data.js)
   用法: CompassWidget.mount('#some-element-id')
   =================================================================== */
(function() {
  'use strict';

  let plannerSelected = [];  // 預設空白，等使用者自行選擇

  // 7 篇上線週公告 target slug → NODE ID (跟 index.html PROFILES 同源)
  const TARGET_TO_NODE = {
    'bookkeeper':  'n72',  // 記帳士
    'landadmin':   'n74',  // 地政士
    'realestate':  'n83',  // 不動產經紀人
    'tax-admin':   'n79',  // 財稅行政
    'tax-law':     'n43',  // 財稅法務
    'elem-admin':  'n23',  // 初等考試一般行政
    'post-acc':    'n89'   // 中華郵政會計類
  };

  function initialChipsFromURL() {
    try {
      const t = new URLSearchParams(window.location.search).get('target');
      if (t && TARGET_TO_NODE[t]) return [TARGET_TO_NODE[t]];
    } catch (e) {}
    return null;
  }
  let mountEl = null;
  let modalEl = null;
  let plannerBlock = null;

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function render() {
    if (!plannerBlock) return;
    const sentenceEl = plannerBlock.querySelector('#cwPlannerSentence');
    const actionsEl  = plannerBlock.querySelector('#cwPlannerActions');
    const resultEl   = plannerBlock.querySelector('#cwPlannerResult');
    if (!sentenceEl) return;

    // ===== Sentence: 我的證照: [chip][chip] [+] =====
    let parts = ['<span class="planner-fixed">我的證照：</span>'];
    if (plannerSelected.length === 0) {
      parts.push('<span class="planner-hint">請點選你的目標證照</span>');
      parts.push('<button class="planner-plus" data-cw-action="add" type="button" title="加一張證照">+</button>');
    } else {
      plannerSelected.forEach(nid => {
        const n = window.NODES && window.NODES[nid];
        if (n) parts.push(`<span class="planner-chip" data-cw-action="remove" data-cw-nid="${escapeAttr(nid)}" title="點擊移除">${n.name}</span>`);
      });
      parts.push('<button class="planner-plus" data-cw-action="add" type="button" title="再加一張">+</button>');
    }
    sentenceEl.innerHTML = parts.join(' ');

    // ===== Actions: 清空重來 =====
    actionsEl.innerHTML = plannerSelected.length > 0
      ? `<div class="planner-actions"><button class="planner-reset-btn" data-cw-action="reset" type="button">清空重來</button></div>`
      : '';

    if (plannerSelected.length === 0) {
      resultEl.innerHTML = '';
      return;
    }

    // ===== 算 union laws + selected sections =====
    const NODES = window.NODES || {};
    const unionLaws = new Set();
    const selectedSections = new Set();
    for (const nid of plannerSelected) {
      const n = NODES[nid];
      if (n && n.laws) n.laws.forEach(l => unionLaws.add(l));
      if (n && n.section) selectedSections.add(n.section);
    }
    const unionCount = unionLaws.size;

    // ===== 算延伸建議 =====
    const selectedSet = new Set(plannerSelected);
    const scored = [];
    for (const nidB in NODES) {
      if (selectedSet.has(nidB)) continue;
      const nB = NODES[nidB];
      if (!nB.laws || nB.laws.length === 0) continue;
      const overlapList = [];
      const missingList = [];
      for (const l of nB.laws) {
        if (unionLaws.has(l)) overlapList.push(l);
        else missingList.push(l);
      }
      if (overlapList.length > 0) {
        scored.push({
          recId: nidB,
          overlap: overlapList.length,
          stillNeed: missingList.length,
          overlapList,
          missingList,
          sameSec: selectedSections.has(nB.section)
        });
      }
    }
    scored.sort((a, b) => {
      if (a.sameSec && !b.sameSec) return -1;
      if (!a.sameSec && b.sameSec) return 1;
      return b.overlap - a.overlap;
    });
    const top = scored.slice(0, 3);

    const isSingle = plannerSelected.length === 1;
    const coverageLabel = isSingle ? '這張路徑' : '這組路徑';
    const extendLabel = isSingle ? '考完還能延伸' : '下一張最高效';

    let topHtml = '';
    if (top.length > 0) {
      topHtml = `<div class="want-extend-label">${extendLabel}</div>` + top.map((item, i) => {
        const rec = NODES[item.recId];
        const rankLabel = ['第一建議', '第二建議', '第三建議'][i];
        const rankClass = i === 1 ? 'rank-2' : (i === 2 ? 'rank-3' : '');
        const crossClass = !item.sameSec ? 'cross-section' : '';
        const overlapAttr = escapeAttr('重複的法規\n' + item.overlapList.map(l => '· ' + l).join('\n'));
        const missingAttr = escapeAttr('還可以補的法規\n' + item.missingList.map(l => '· ' + l).join('\n'));
        const detail = isSingle
          ? `<span class="planner-tip" data-tip="${overlapAttr}">因為有共同科目與法規基礎</span>,可接著規劃`
          : `<span class="planner-tip" data-tip="${overlapAttr}">已有共同基礎</span>,<span class="planner-tip" data-tip="${missingAttr}">可再補下一段</span>`;
        return `<div class="planner-result-line ${crossClass}"><span class="planner-result-rank" ${crossClass ? 'title="跨體系建議:這張不同分類但有共同法規,適合想轉軌的考生"' : ''}>${rankLabel}</span>我可以再去考「<span class="planner-result-target ${rankClass}">${rec.name}</span>」 ${detail}</div>`;
      }).join('');
    }

    resultEl.innerHTML = `
      <div class="planner-result">
        <div class="want-coverage">
          <span class="want-check">✓</span> ${coverageLabel}會依考試目標整理可用範圍 · 法條庫對照中,陸續上線
        </div>
        ${topHtml}
      </div>
    `;
  }

  function openModal() {
    if (!modalEl) return;
    const body = modalEl.querySelector('#cwModalBody');
    const SECTIONS = window.SECTIONS || [];
    const SEC_NODES = window.SEC_NODES || {};
    const SEC_EMOJI = window.SEC_EMOJI || {};
    const exSet = new Set(plannerSelected);
    let html = '';
    for (const sec of SECTIONS) {
      const items = (SEC_NODES[sec] || []).filter(n => !exSet.has(n.id));
      if (items.length === 0) continue;
      const emoji = SEC_EMOJI[sec] || '📁';
      let opts = '';
      for (const item of items) {
        opts += `<button class="modal-option" data-cw-action="pick" data-cw-nid="${escapeAttr(item.id)}" type="button">${item.name}</button>`;
      }
      html += `
        <div class="modal-section">
          <div class="modal-section-title">${emoji} ${sec}</div>
          <div class="modal-options">${opts}</div>
        </div>
      `;
    }
    body.innerHTML = html;
    modalEl.classList.add('active');
  }

  function closeModal() {
    if (modalEl) modalEl.classList.remove('active');
  }

  function addChip(nid) {
    if (!plannerSelected.includes(nid)) plannerSelected.push(nid);
    closeModal();
    render();
  }

  function removeChip(nid) {
    plannerSelected = plannerSelected.filter(x => x !== nid);
    render();
  }

  function resetAll() {
    plannerSelected = [];
    render();
  }

  function onWidgetClick(e) {
    const target = e.target.closest('[data-cw-action]');
    if (!target) return;
    const action = target.getAttribute('data-cw-action');
    const nid = target.getAttribute('data-cw-nid');
    if (action === 'add')        { e.preventDefault(); openModal(); }
    else if (action === 'remove'){ e.preventDefault(); removeChip(nid); }
    else if (action === 'reset') { e.preventDefault(); resetAll(); }
    else if (action === 'pick')  { e.preventDefault(); addChip(nid); }
  }

  function onModalBgClick(e) {
    if (e.target === modalEl) closeModal();
  }

  function onTapAccordion(e) {
    if (!window.matchMedia('(hover: none)').matches) return;
    const tip = e.target.closest('.planner-tip');
    const xline = e.target.closest('.planner-result-line.cross-section');
    document.querySelectorAll('.tip-open').forEach(el => { if (el !== tip) el.classList.remove('tip-open'); });
    document.querySelectorAll('.line-open').forEach(el => { if (el !== xline) el.classList.remove('line-open'); });
    if (tip) {
      e.preventDefault();
      tip.classList.toggle('tip-open');
    } else if (xline) {
      xline.classList.toggle('line-open');
    }
  }

  function mount(selectorOrEl, options) {
    mountEl = (typeof selectorOrEl === 'string')
      ? document.querySelector(selectorOrEl)
      : selectorOrEl;
    if (!mountEl) {
      console.warn('[CompassWidget] mount target not found:', selectorOrEl);
      return;
    }
    if (!window.NODES || !window.SECTIONS) {
      console.warn('[CompassWidget] exam-data.js not loaded — NODES/SECTIONS missing');
      return;
    }

    // 決定初始 chip：明確傳入 > URL ?target= > default
    const opts = options || {};
    let initial = null;
    if (Array.isArray(opts.initialChips) && opts.initialChips.length > 0) {
      initial = opts.initialChips.filter(nid => window.NODES[nid]);
    }
    if (!initial || initial.length === 0) {
      const fromURL = initialChipsFromURL();
      if (fromURL) initial = fromURL;
    }
    if (initial && initial.length > 0) plannerSelected = initial;

    mountEl.innerHTML = `
      <section class="planner" id="cwPlannerBlock">
        <span class="planner-label">我的證照</span>
        <div class="compass-label-hint">（已考過或想考的都可加）</div>
        <div id="cwPlannerSentence" class="planner-sentence"></div>
        <div id="cwPlannerActions"></div>
        <div id="cwPlannerResult"></div>
      </section>
      <div id="cwModalOverlay" class="modal-overlay" role="dialog" aria-modal="true">
        <div class="modal-box">
          <div class="modal-header">
            <div class="modal-title">選擇職能</div>
            <button class="modal-close" data-cw-action="close" type="button" aria-label="關閉">×</button>
          </div>
          <div id="cwModalBody" class="modal-body"></div>
        </div>
      </div>
    `;

    plannerBlock = mountEl.querySelector('#cwPlannerBlock');
    modalEl = mountEl.querySelector('#cwModalOverlay');
    modalEl.querySelector('.modal-close').addEventListener('click', closeModal);
    modalEl.addEventListener('click', onModalBgClick);
    mountEl.addEventListener('click', onWidgetClick);
    document.body.addEventListener('click', onTapAccordion);

    render();
  }

  window.CompassWidget = {
    mount,
    TARGET_TO_NODE,
    getSelected: () => plannerSelected.slice(),
  };
})();
