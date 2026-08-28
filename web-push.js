(function(root, factory){
  var api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  if(root) root.SoFaWebPush = api;
})(typeof window !== 'undefined' ? window : globalThis, function(){
  'use strict';

  function isIOS(nav){
    var ua = String((nav && nav.userAgent) || '');
    return /iPad|iPhone|iPod/.test(ua) || ((nav && nav.platform) === 'MacIntel' && Number(nav.maxTouchPoints || 0) > 1);
  }

  function isStandalone(win, nav){
    return !!((nav && nav.standalone === true) || (win && win.matchMedia && win.matchMedia('(display-mode: standalone)').matches));
  }

  function capabilityState(env){
    var win = env.window || {};
    var nav = env.navigator || {};
    if(isIOS(nav) && !isStandalone(win, nav)) return 'install_required';
    if(!env.secureContext || !nav.serviceWorker || !win.PushManager || !win.Notification) return 'unsupported';
    if(win.Notification.permission === 'denied') return 'blocked';
    return 'ready';
  }

  function authHeaders(storage){
    var token = storage && storage.getItem('sofa_token');
    var uid = storage && storage.getItem('sofa_uid');
    if(token) return {Authorization:'Bearer ' + token};
    if(uid) return {'X-Sofa-UID':uid};
    return null;
  }

  function pushMode(storage){
    if(authHeaders(storage)) return 'member_srs';
    if(storage && storage.getItem('sofa_free') === 'FREE') return 'free_daily';
    return 'signed_out';
  }

  function installationToken(storage, crypto){
    var key = 'sofa_push_installation';
    var existing = storage && storage.getItem(key);
    if(existing) return existing;
    var bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    var raw = '';
    bytes.forEach(function(value){ raw += String.fromCharCode(value); });
    var token = btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    storage.setItem(key, token);
    return token;
  }

  function urlBase64ToUint8Array(base64String){
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = atob(base64);
    return Uint8Array.from(Array.prototype.map.call(rawData, function(character){ return character.charCodeAt(0); }));
  }

  function controller(options){
    var win = options.window || window;
    var nav = options.navigator || navigator;
    var doc = options.document || document;
    var storage = options.storage || localStorage;
    var fetchFn = options.fetch || fetch.bind(win);
    var apiBase = String(options.apiBase || '').replace(/\/$/, '');
    var stateEl = doc.getElementById('web-push-state');
    var titleEl = doc.getElementById('web-push-title');
    var enableButton = doc.getElementById('web-push-enable');
    var disableButton = doc.getElementById('web-push-disable');
    var testButton = doc.getElementById('web-push-test');
    var currentMode = pushMode(storage);
    var freeToken = '';

    function isFree(){ return currentMode === 'free_daily'; }

    function setModeCopy(){
      if(titleEl) titleEl.textContent = isFree() ? '免費刷題提醒' : '裝置複習提醒';
      if(enableButton) enableButton.textContent = isFree() ? '每天提醒我刷題' : '依複習曲線提醒';
    }

    function render(state, message){
      if(stateEl) stateEl.textContent = message;
      if(enableButton) enableButton.hidden = !(['ready','error'].indexOf(state) >= 0);
      if(disableButton) disableButton.hidden = state !== 'enabled';
      if(testButton) testButton.hidden = state !== 'enabled';
      if(enableButton) enableButton.disabled = state === 'loading';
      if(disableButton) disableButton.disabled = state === 'loading';
      if(testButton) testButton.disabled = state === 'loading';
    }

    function headers(withJson){
      var result;
      if(isFree()){
        freeToken = freeToken || installationToken(storage, options.crypto || win.crypto);
        result = {'X-Sofa-Installation':freeToken};
      }else{
        result = authHeaders(storage);
      }
      if(!result) return null;
      if(withJson) result['Content-Type'] = 'application/json';
      return result;
    }

    async function registration(){
      await nav.serviceWorker.register('/sw.js', {scope:'/'});
      return nav.serviceWorker.ready;
    }

    async function init(){
      if(enableButton) enableButton.addEventListener('click', enableDeviceReminder);
      if(disableButton) disableButton.addEventListener('click', disableDeviceReminder);
      if(testButton) testButton.addEventListener('click', function(){
        sendTestNotification().catch(function(){
          render('enabled', '測試訊息暫時未送出；請稍後再按一次。');
        });
      });
      if(currentMode === 'signed_out'){
        render('signed_out', '先選免費刷題或登入，才能設定這台裝置的提醒。');
        return;
      }
      if(currentMode === 'member_srs'){
        try{
          var eligibility = await fetchFn(apiBase + '/api/me/web-push-subscriptions/status', {headers:headers(false)});
          if(eligibility.status === 403){ currentMode = 'free_daily'; freeToken = ''; }
          else if(!eligibility.ok) throw new Error('eligibility unavailable');
        }catch(_eligibilityError){
          render('error', '裝置提醒資格暫時無法確認。');
          return;
        }
      }
      setModeCopy();
      var capability = capabilityState({window:win,navigator:nav,secureContext:win.isSecureContext !== false});
      if(capability === 'install_required'){
        render(capability, '先將 SoFa 加入主畫面，再從主畫面開啟提醒。');
        return;
      }
      if(capability === 'unsupported'){
        render(capability, '此瀏覽器不支援裝置提醒。');
        return;
      }
      if(capability === 'blocked'){
        render(capability, '通知已被封鎖。iPhone 請到「設定 → 通知 → SoFa Engine」重新允許。');
        return;
      }
      try{
        var reg = await registration();
        var existing = await reg.pushManager.getSubscription();
        if(existing && win.Notification.permission === 'granted'){
          render('enabled', isFree()
            ? '這台裝置已開啟。每天 20:00 提醒刷 5 題，不保存學習紀錄。'
            : '這台裝置已開啟。每天 20:00 後，有複習到期才提醒。');
        }else{
          render('ready', isFree()
            ? '每天 20:00 提醒刷 5 題；不保存學習紀錄，一天最多一則。'
            : '每天 20:00 後，有複習到期才提醒；一天最多一則。');
        }
      }catch(_error){
        render('error', '裝置提醒暫時無法讀取。');
      }
    }

    async function enableDeviceReminder(){
      var requestHeaders = headers(true);
      if(!requestHeaders){
        render('signed_out', '先選免費刷題或登入，才能設定提醒。');
        return;
      }
      render('loading', '正在開啟裝置提醒…');
      try{
        var permission = await win.Notification.requestPermission();
        if(permission !== 'granted'){
          render('blocked', '通知未開啟。iPhone 請到「設定 → 通知 → SoFa Engine」重新允許。');
          return;
        }
        var keyResponse = await fetchFn(apiBase + '/api/web-push/public-key');
        if(!keyResponse.ok) throw new Error('public key unavailable');
        var keyPayload = await keyResponse.json();
        if(!keyPayload.public_key) throw new Error('public key missing');
        var reg = await registration();
        var subscription = await reg.pushManager.getSubscription();
        if(!subscription){
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly:true,
            applicationServerKey:urlBase64ToUint8Array(keyPayload.public_key),
          });
        }
        var subscribePath = isFree() ? '/api/free/web-push-subscriptions' : '/api/me/web-push-subscriptions';
        var subscribeBody = isFree()
          ? {installation_token:freeToken, subscription:subscription.toJSON()}
          : subscription.toJSON();
        var response = await fetchFn(apiBase + subscribePath, {
          method:'POST', headers:requestHeaders, body:JSON.stringify(subscribeBody),
        });
        if(!response.ok) throw new Error('subscription save failed');
        try{
          await sendTestNotification();
        }catch(_testError){
          render('enabled', '提醒已開啟，但測試訊息暫時未送出；可按「傳送測試通知」重試。');
        }
      }catch(_error){
        render('error', '裝置提醒暫時無法開啟，請稍後再試。');
      }
    }

    async function sendTestNotification(){
      render('loading', '正在傳送測試通知…');
      var reg = await registration();
      var subscription = await reg.pushManager.getSubscription();
      if(!subscription) throw new Error('subscription missing');
      var requestHeaders = headers(true);
      var testPath = isFree() ? '/api/free/web-push-subscriptions/test' : '/api/me/web-push-subscriptions/test';
      var body = isFree()
        ? {installation_token:freeToken, endpoint:subscription.endpoint}
        : {endpoint:subscription.endpoint};
      var response = await fetchFn(apiBase + testPath, {
        method:'POST', headers:requestHeaders, body:JSON.stringify(body),
      });
      if(!response.ok) throw new Error('test send failed');
      render('enabled', '測試通知已送出。若畫面上方沒看到，請打開通知中心確認。');
      return true;
    }

    async function disableDeviceReminder(){
      var requestHeaders = headers(true);
      if(!requestHeaders) return render('signed_out', '先選免費刷題或登入，才能調整提醒。');
      render('loading', '正在關閉裝置提醒…');
      try{
        var reg = await registration();
        var subscription = await reg.pushManager.getSubscription();
        if(subscription){
          var deletePath = isFree() ? '/api/free/web-push-subscriptions' : '/api/me/web-push-subscriptions';
          var deleteBody = isFree()
            ? {installation_token:freeToken, endpoint:subscription.endpoint}
            : {endpoint:subscription.endpoint};
          var response = await fetchFn(apiBase + deletePath, {
            method:'DELETE', headers:requestHeaders, body:JSON.stringify(deleteBody),
          });
          if(!response.ok) throw new Error('subscription delete failed');
          await subscription.unsubscribe();
        }
        render('ready', isFree()
          ? '這台裝置已關閉。免費版仍不保存學習紀錄。'
          : '這台裝置已關閉。複習進度仍會保留。');
      }catch(_error){
        render('enabled', '暫時無法關閉，這台裝置仍保留提醒。');
      }
    }

    return {init:init, enableDeviceReminder:enableDeviceReminder, disableDeviceReminder:disableDeviceReminder, sendTestNotification:sendTestNotification};
  }

  function init(options){
    return controller(options || {}).init();
  }

  return {
    authHeaders:authHeaders,
    capabilityState:capabilityState,
    controller:controller,
    init:init,
    isIOS:isIOS,
    isStandalone:isStandalone,
    installationToken:installationToken,
    pushMode:pushMode,
    urlBase64ToUint8Array:urlBase64ToUint8Array,
  };
});
