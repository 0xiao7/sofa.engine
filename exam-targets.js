(function(){
  const TARGETS = {
    bookkeeper: {
      key: 'bookkeeper',
      label: '記帳士',
      examDate: '2026-11-14T00:00:00+08:00',
      examDisplay: '2026 / 11 / 14',
      laws: '33',
      articles: '2,157',
      highlight: '營利事業所得稅查核準則 143 條（記帳士獨家）'
    },
    landadmin: {
      key: 'landadmin',
      label: '地政士',
      laws: '23',
      articles: '3,650',
      highlight: '民法 1,439 / 地籍測量規則 324 / 土地登記規則 184'
    },
    realestate: {
      key: 'realestate',
      label: '不動產經紀人',
      laws: '19',
      articles: '3,058',
      highlight: '民法 / 土地法 / 不動產經紀業管理條例'
    },
    'tax-admin': {
      key: 'tax-admin',
      label: '財稅行政',
      laws: '20',
      articles: '2,590',
      highlight: '貨物稅 / 印花稅 / 使用牌照稅 三細節稅法'
    },
    'tax-law': {
      key: 'tax-law',
      label: '財稅法務',
      laws: '19',
      articles: '3,439',
      highlight: '民法 + 刑法 422 + 行政訴訟法 390 + 全套稅法'
    },
    'elem-admin': {
      key: 'elem-admin',
      label: '初等一般行政',
      laws: '11',
      articles: '2,886',
      highlight: '公務員入門八大法 + 民刑法基底'
    },
    'post-acc': {
      key: 'post-acc',
      label: '中華郵政會計類',
      laws: '10',
      articles: '1,349',
      highlight: '公司法 / 會計法 / 預算法 / 決算法 / 郵政法'
    }
  };

  function getSearchTarget(){
    try{
      const params = new URLSearchParams(window.location.search);
      return params.get('target') || params.get('exam_target') || '';
    }catch(e){
      return '';
    }
  }

  function readStoredTarget(){
    try{
      return localStorage.getItem('sofa_exam_target') || localStorage.getItem('sofa.target') || '';
    }catch(e){
      return '';
    }
  }

  function writeStoredTarget(key){
    try{
      localStorage.setItem('sofa_exam_target', key);
      localStorage.setItem('sofa.target', key);
    }catch(e){}
  }

  const UNKNOWN_TARGET = {
    key: '',
    label: '目標考試',
    laws: '—',
    articles: '—',
    highlight: '先選你的考試目標，倒數才會開始計算。'
  };

  function resolveTarget(){
    const fromUrl = getSearchTarget();
    if(fromUrl && TARGETS[fromUrl]){
      writeStoredTarget(fromUrl);
      return TARGETS[fromUrl];
    }
    const stored = readStoredTarget();
    if(stored && TARGETS[stored]) return TARGETS[stored];
    return UNKNOWN_TARGET;
  }

  function daysUntil(target){
    const t = target || resolveTarget();
    if(!t || !t.examDate) return null;
    const diff = new Date(t.examDate) - new Date();
    return Math.max(Math.ceil(diff / 86400000), 0);
  }

  function textForDays(target, suffix){
    const d = daysUntil(target);
    if(d === null) return '考期未設定';
    return String(d) + (suffix || '');
  }

  function renderCountdown(options){
    const target = resolveTarget();
    const opts = options || {};
    const d = daysUntil(target);
    const all = function(selector){
      return selector ? document.querySelectorAll(selector) : [];
    };
    all(opts.days).forEach(function(el){
      if(d === null){
        el.textContent = opts.emptyDaysText || '—';
      }else if(opts.htmlDays){
        el.innerHTML = String(d) + opts.htmlDays;
      }else{
        el.textContent = String(d) + (opts.daysSuffix || '');
      }
    });
    all(opts.date).forEach(function(el){
      el.textContent = target.examDisplay || '考期未設定';
    });
    all(opts.label).forEach(function(el){
      el.textContent = target.label || '目標考試';
    });
    all(opts.bar).forEach(function(el){
      el.textContent = target.examDisplay ? target.examDisplay + '  ' + target.label + '考試' : target.label + ' · 考期未設定';
    });
    return target;
  }

  window.SoFaExamTargets = {
    TARGETS,
    UNKNOWN_TARGET,
    resolveTarget,
    daysUntil,
    textForDays,
    renderCountdown
  };
})();
