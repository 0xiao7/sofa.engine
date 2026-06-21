/* ============================================================
   notes-store.js — 私人筆記庫共用儲存層
   dashboard.html（寫筆記）與 notes.html（看筆記）共用。

   offline-first：localStorage['sofa_notes_v1'] 永遠是本地層
   （未登入也能寫、能看，零退化）；登入後加一層 Supabase 同步，
   跨裝置跟著走。雲端失敗永不中斷本地寫入。

   本地格式（沿用既有）：
     notes[articleId] = { text, updatedAt, lawName, articleNo }
   雲端格式（/api/me/article-notes）：
     { article_id, law_name, article_no, text, updated_at }
   ============================================================ */
(function () {
  'use strict';

  var API = 'https://sofa-engine-api.onrender.com';
  var KEY = 'sofa_notes_v1';

  function _read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function _write(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* ignore quota */ }
  }
  function _loggedIn() {
    var tok = localStorage.getItem('sofa_token');
    var uid = localStorage.getItem('sofa_uid');
    return !!(tok || (uid && uid !== 'FREE'));
  }
  function _authH() {
    var h = { 'Content-Type': 'application/json' };
    var tok = localStorage.getItem('sofa_token') || '';
    var uid = localStorage.getItem('sofa_uid') || '';
    if (tok) h['Authorization'] = 'Bearer ' + tok;
    else if (uid) h['X-Sofa-UID'] = uid;
    return h;
  }
  function _newer(a, b) {
    // 回傳 updatedAt 較新者；缺值視為最舊
    return (new Date(a || 0)) >= (new Date(b || 0));
  }

  // ── 雲端最佳努力呼叫（失敗靜默，不擋本地）──
  function _cloudPost(id, n) {
    if (!_loggedIn()) return;
    fetch(API + '/api/me/article-notes', {
      method: 'POST', headers: _authH(),
      body: JSON.stringify({
        article_id: id, text: n.text || '',
        law_name: n.lawName || '', article_no: n.articleNo || ''
      })
    }).catch(function () { /* offline-first：忽略 */ });
  }
  function _cloudDelete(id) {
    if (!_loggedIn()) return;
    fetch(API + '/api/me/article-notes/' + encodeURIComponent(id), {
      method: 'DELETE', headers: _authH()
    }).catch(function () { /* 忽略 */ });
  }

  var notesStore = {
    /** 全部筆記，新→舊；每筆 { articleId, text, updatedAt, lawName, articleNo } */
    all: function () {
      var o = _read();
      return Object.keys(o).map(function (id) {
        var n = o[id] || {};
        return {
          articleId: id, text: n.text || '', updatedAt: n.updatedAt || '',
          lawName: n.lawName || '', articleNo: n.articleNo || ''
        };
      }).filter(function (n) { return n.text && n.text.trim(); })
        .sort(function (a, b) { return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0); });
    },

    get: function (id) { return _read()[id] || null; },

    /** 寫筆記：先寫本地（同步成功），登入則背景上雲。text 空＝刪除。 */
    save: function (id, data) {
      if (!id) return;
      data = data || {};
      var text = (data.text || '').trim();
      var o = _read();
      if (text) {
        o[id] = {
          text: text, updatedAt: new Date().toISOString(),
          lawName: data.lawName || (o[id] && o[id].lawName) || '',
          articleNo: data.articleNo || (o[id] && o[id].articleNo) || ''
        };
        _write(o);
        _cloudPost(id, o[id]);
      } else {
        this.remove(id);
      }
    },

    remove: function (id) {
      var o = _read();
      if (o[id]) { delete o[id]; _write(o); }
      _cloudDelete(id);
    },

    /** 拉雲端 → 與本地依 updatedAt 合併（新者贏）；本地較新者回推雲端
        （首次登入＝雲端為空，等同把舊筆記一次上推）。回傳 Promise。 */
    sync: function () {
      if (!_loggedIn()) return Promise.resolve(false);
      return fetch(API + '/api/me/article-notes', { headers: _authH() })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (!data || !data.notes) return false;
          var local = _read();
          var cloud = {};
          data.notes.forEach(function (c) {
            if (c && c.article_id) cloud[c.article_id] = {
              text: c.text || '', updatedAt: c.updated_at || '',
              lawName: c.law_name || '', articleNo: c.article_no || ''
            };
          });
          var ids = {};
          Object.keys(local).forEach(function (k) { ids[k] = 1; });
          Object.keys(cloud).forEach(function (k) { ids[k] = 1; });
          var merged = {};
          var toPush = [];
          Object.keys(ids).forEach(function (id) {
            var l = local[id], c = cloud[id];
            if (l && c) {
              if (_newer(l.updatedAt, c.updatedAt)) { merged[id] = l; toPush.push(id); }
              else { merged[id] = c; }
            } else if (l) { merged[id] = l; toPush.push(id); }  // 雲端缺＝上推
            else { merged[id] = c; }                            // 本地缺＝拉下
          });
          _write(merged);
          // 回推本地較新/雲端缺的（含首登舊筆記）
          toPush.forEach(function (id) {
            if (merged[id] && merged[id].text) _cloudPost(id, merged[id]);
          });
          return true;
        })
        .catch(function () { return false; });
    },

    /** 匯出 .txt（沿用 dashboard 既有格式）。 */
    exportTxt: function () {
      var entries = this.all();
      if (!entries.length) return false;
      var date = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
      var txt = 'SoFa 個人筆記匯出 — ' + date + '\n';
      txt += '========================================\n\n';
      entries.forEach(function (n) {
        if (n.lawName) txt += '【' + n.lawName + '】';
        if (n.articleNo) txt += ' ' + n.articleNo;
        if (n.lawName || n.articleNo) txt += '\n';
        txt += n.text.trim() + '\n';
        if (n.updatedAt) {
          var d = new Date(n.updatedAt).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' });
          txt += '  — ' + d + '\n';
        }
        txt += '\n';
      });
      var blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'sofa_notes_' + new Date().toISOString().slice(0, 10) + '.txt';
      a.click();
      URL.revokeObjectURL(url);
      return entries.length;
    },

    isLoggedIn: _loggedIn
  };

  window.notesStore = notesStore;
})();
