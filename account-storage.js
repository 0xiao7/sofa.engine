(function (global) {
  'use strict';

  var VERSION = '20260908-account-scope-v1';
  var PREFIX = 'sofa.account.v1:';
  var LEGACY_ARCHIVE = 'sofa.account.legacy.v1';
  var GUEST_KEY = 'sofa.account.guest.v1';
  var StorageCtor = global.Storage;
  if (!StorageCtor || !StorageCtor.prototype || global.SoFaAccountStorage) return;

  var proto = StorageCtor.prototype;
  var originals = proto.__sofaAccountStorageOriginals;
  if (!originals) {
    originals = {
      getItem: proto.getItem,
      setItem: proto.setItem,
      removeItem: proto.removeItem,
      key: proto.key
    };
    Object.defineProperty(proto, '__sofaAccountStorageOriginals', {
      value: originals, configurable: false, enumerable: false, writable: false
    });
  }
  var nativeGet = originals.getItem;
  var nativeSet = originals.setItem;
  var nativeRemove = originals.removeItem;
  var nativeKey = originals.key;

  var exactPrivate = new Set([
    'sofa_notes_v1', 'sofa_notes_tomb_v1', 'sofa_wrong_ids', 'sofa_wrong_bank',
    'sofa_recent_quiz_articles_v1', 'sofa_recent_past_exam_questions_v1',
    'sofa_quiz_stats_v1', 'sofa_exam_history_v1', 'sofa_last_law', 'sofa_last_tool',
    'sofa_practice_law', 'sofa_practice_exam_key', 'sofa_fill_law',
    'sofa_past_exam_subject', 'sofa_past_exam_year', 'sofa.study.localPlan.v1',
    'sofa_chalk_v1', 'sofa_achievements', 'sofa_nickname',
    'fs_wpm', 'fs_wpmh', 'fs_daily', 'fs_streak', 'fs_today', 'fs_sched'
  ]);
  var privatePrefixes = [
    'sofa_quiz_daily_', 'sofa_daily_', 'sofa_room_note_', 'sofa_study_time_', 'sofa.study.'
  ];

  function isPrivateKey(key) {
    key = String(key || '');
    if (!key || key.indexOf(PREFIX) === 0 || key === LEGACY_ARCHIVE || key === GUEST_KEY) return false;
    if (exactPrivate.has(key)) return true;
    return privatePrefixes.some(function (prefix) { return key.indexOf(prefix) === 0; });
  }

  function rawGet(storage, key) {
    return nativeGet.call(storage, String(key));
  }

  function tokenOwner() {
    var token = rawGet(global.localStorage, 'sofa_token') || '';
    var uid = rawGet(global.localStorage, 'sofa_uid') || '';
    if (!token || !uid) return null;
    try {
      var payloadPart = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
      while (payloadPart.length % 4) payloadPart += '=';
      var decode = global.atob || function (value) { return Buffer.from(value, 'base64').toString('binary'); };
      var payload = JSON.parse(decode(payloadPart));
      if (!payload || String(payload.uid || '') !== String(uid)) return null;
      if (payload.exp && Number(payload.exp) * 1000 <= Date.now()) return null;
      return String(uid);
    } catch (_) {
      return null;
    }
  }

  function hash(value) {
    var h = 2166136261;
    for (var i = 0; i < value.length; i += 1) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  function guestId() {
    var existing = rawGet(global.sessionStorage, GUEST_KEY);
    if (existing) return existing;
    var value = 'g-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    nativeSet.call(global.sessionStorage, GUEST_KEY, value);
    return value;
  }

  function currentOwner() { return tokenOwner(); }

  function currentScope() {
    var owner = currentOwner();
    if (owner) return 'member-' + hash(owner);
    if (rawGet(global.localStorage, 'sofa_free')) return 'guest-' + hash(guestId());
    return null;
  }

  function scopedKey(key) {
    var scope = currentScope();
    return scope && isPrivateKey(key) ? PREFIX + scope + ':' + String(key) : null;
  }

  function archiveLegacy(storage, storageName, key) {
    if (!isPrivateKey(key)) return;
    var value = rawGet(storage, key);
    if (value === null) return;
    var rawArchive = rawGet(global.localStorage, LEGACY_ARCHIVE);
    var archive = { entries: {} };
    try { archive = rawArchive ? JSON.parse(rawArchive) : archive; } catch (_) { archive = { entries: {} }; }
    if (!archive.entries || typeof archive.entries !== 'object') archive.entries = {};
    var archiveKey = storageName === 'localStorage' ? key : storageName + ':' + key;
    if (!archive.entries[archiveKey]) {
      archive.entries[archiveKey] = {
        key: String(key), storage: storageName, value: value,
        owner: null, archivedAt: new Date().toISOString()
      };
      nativeSet.call(global.localStorage, LEGACY_ARCHIVE, JSON.stringify(archive));
    }
  }

  function archiveExisting(storage, storageName) {
    var keys = [];
    for (var i = 0; i < storage.length; i += 1) {
      var key = nativeKey.call(storage, i);
      if (isPrivateKey(key)) keys.push(key);
    }
    keys.forEach(function (key) { archiveLegacy(storage, storageName, key); });
  }

  function storageName(storage) {
    return storage === global.sessionStorage ? 'sessionStorage' : 'localStorage';
  }

  proto.getItem = function (key) {
    key = String(key);
    if (!isPrivateKey(key)) return nativeGet.call(this, key);
    archiveLegacy(this, storageName(this), key);
    var scoped = scopedKey(key);
    return scoped ? nativeGet.call(this, scoped) : null;
  };

  proto.setItem = function (key, value) {
    key = String(key);
    if (!isPrivateKey(key)) return nativeSet.call(this, key, String(value));
    archiveLegacy(this, storageName(this), key);
    var scoped = scopedKey(key);
    if (scoped) return nativeSet.call(this, scoped, String(value));
  };

  proto.removeItem = function (key) {
    key = String(key);
    if (!isPrivateKey(key)) return nativeRemove.call(this, key);
    archiveLegacy(this, storageName(this), key);
    var scoped = scopedKey(key);
    if (scoped) return nativeRemove.call(this, scoped);
  };

  archiveExisting(global.localStorage, 'localStorage');
  archiveExisting(global.sessionStorage, 'sessionStorage');

  global.SoFaAccountStorage = Object.freeze({
    version: VERSION,
    isPrivateKey: isPrivateKey,
    currentOwner: currentOwner,
    currentScope: currentScope,
    scopedKey: scopedKey,
    rawGet: function (storage, key) {
      if (arguments.length === 1) return rawGet(global.localStorage, storage);
      return rawGet(storage, key);
    },
    getLegacyArchive: function () {
      try { return JSON.parse(rawGet(global.localStorage, LEGACY_ARCHIVE) || '{}'); }
      catch (_) { return {}; }
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
