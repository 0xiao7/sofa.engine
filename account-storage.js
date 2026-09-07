/* SoFa account-scoped localStorage boundary.
 *
 * Authentication and anonymous analytics identifiers stay device-global. Every
 * other logical key is stored under the active account (or guest) namespace.
 * Ownerless legacy values are copied to a recoverable quarantine and are never
 * attributed, uploaded, or deleted automatically.
 */
(function (root) {
  'use strict';

  if (!root || !root.localStorage || root.SoFaAccountStorage) return;

  var storage = root.localStorage;
  var proto = Object.getPrototypeOf(storage);
  var rawGet = proto.getItem;
  var rawSet = proto.setItem;
  var rawRemove = proto.removeItem;
  var rawKey = proto.key;
  var rawClear = proto.clear;
  var PREFIX = 'sofa.account.v1:';
  var QUARANTINE_KEY = 'sofa.account.quarantine.v1';
  var GLOBAL_KEYS = {
    sofa_uid: true,
    sofa_token: true,
    sofa_free: true,
    sofa_attribution_v1: true,
    sofa_session_id_v1: true
  };

  function rawGetItem(key) { return rawGet.call(storage, String(key)); }
  function rawSetItem(key, value) { rawSet.call(storage, String(key), String(value)); }
  function rawRemoveItem(key) { rawRemove.call(storage, String(key)); }
  function isSystemKey(key) { return key === QUARANTINE_KEY || key.indexOf(PREFIX) === 0; }
  function shouldScope(key) { return !GLOBAL_KEYS[key] && !isSystemKey(key); }
  function accountId() {
    var uid = (rawGetItem('sofa_uid') || '').trim();
    return uid && uid !== 'FREE' ? uid : 'guest';
  }
  function physicalKey(logicalKey, uid) {
    return PREFIX + encodeURIComponent(uid || accountId()) + ':' + String(logicalKey);
  }
  function readQuarantine() {
    try {
      var parsed = JSON.parse(rawGetItem(QUARANTINE_KEY) || '{}');
      if (!parsed || parsed.version !== 1 || !parsed.entries) throw new Error('invalid');
      return parsed;
    } catch (_) {
      return { version: 1, entries: {} };
    }
  }
  function quarantineLegacy(logicalKey) {
    var key = String(logicalKey);
    if (!shouldScope(key)) return false;
    var value = rawGetItem(key);
    if (value === null) return false;
    var archive = readQuarantine();
    if (!archive.entries[key]) {
      archive.entries[key] = { value: value, archivedAt: new Date().toISOString(), owner: null };
      rawSetItem(QUARANTINE_KEY, JSON.stringify(archive));
    }
    return true;
  }
  function sweepLegacy() {
    var keys = [];
    for (var i = 0; i < storage.length; i += 1) {
      var key = rawKey.call(storage, i);
      if (key) keys.push(key);
    }
    keys.forEach(quarantineLegacy);
  }

  proto.getItem = function (key) {
    key = String(key);
    if (this !== storage || !shouldScope(key)) return rawGet.call(this, key);
    quarantineLegacy(key);
    return rawGetItem(physicalKey(key));
  };
  proto.setItem = function (key, value) {
    key = String(key);
    if (this !== storage || !shouldScope(key)) return rawSet.call(this, key, value);
    quarantineLegacy(key);
    return rawSetItem(physicalKey(key), value);
  };
  proto.removeItem = function (key) {
    key = String(key);
    if (this !== storage || !shouldScope(key)) return rawRemove.call(this, key);
    quarantineLegacy(key);
    return rawRemoveItem(physicalKey(key));
  };
  proto.clear = function () {
    if (this !== storage) return rawClear.call(this);
    var namespace = PREFIX + encodeURIComponent(accountId()) + ':';
    var keys = [];
    for (var i = 0; i < storage.length; i += 1) {
      var key = rawKey.call(storage, i);
      if (key && key.indexOf(namespace) === 0) keys.push(key);
    }
    keys.forEach(rawRemoveItem);
  };

  sweepLegacy();

  root.SoFaAccountStorage = {
    version: 1,
    activeAccountId: accountId,
    physicalKey: physicalKey,
    listLegacyArchives: function () {
      var archive = readQuarantine();
      return Object.keys(archive.entries).sort().map(function (key) {
        return { key: key, archivedAt: archive.entries[key].archivedAt, owner: null };
      });
    },
    recoverLegacy: function (logicalKey) {
      var uid = accountId();
      if (uid === 'guest') return false;
      var archive = readQuarantine();
      var item = archive.entries[String(logicalKey)];
      if (!item || typeof item.value !== 'string') return false;
      rawSetItem(physicalKey(logicalKey, uid), item.value);
      return true;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
