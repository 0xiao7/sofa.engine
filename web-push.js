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
    var enableButton = doc.getElementById('web-push-enable');
    var disableButton = doc.getElementById('web-push-disable');

    function render(state, message){
      if(stateEl) stateEl.textContent = message;
      if(enableButton) enableButton.hidden = !(['ready','error'].indexOf(state) >= 0);
      if(disableButton) disableButton.hidden = state !== 'enabled';
      if(enableButton) enableButton.disabled = state === 'loading';
      if(disableButton) disableButton.disabled = state === 'loading';
    }

    function headers(withJson){
      var auth = authHeaders(storage);
      if(!auth) return null;
      if(withJson) auth['Content-Type'] = 'application/json';
      return auth;
    }

    async function registration(){
      await nav.serviceWorker.register('/sw.js', {scope:'/'});
      return nav.serviceWorker.ready;
    }

    async function init(){
      if(enableButton) enableButton.addEventListener('click', enableDeviceReminder);
      if(disableButton) disableButton.addEventListener('click', disableDeviceReminder);
      if(!headers(false)){
        render('signed_out', '登入後，才能把提醒綁定到這台裝置。');
        return;
      }
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
        render(capability, '通知已被系統封鎖，請到裝置設定調整。');
        return;
      }
      try{
        var reg = await registration();
        var existing = await reg.pushManager.getSubscription();
        if(existing && win.Notification.permission === 'granted'){
          render('enabled', '這台裝置已開啟。每天 20:00 後，有複習到期才提醒。');
        }else{
          render('ready', '每天 20:00 後，有複習到期才提醒；一天最多一則。');
        }
      }catch(_error){
        render('error', '裝置提醒暫時無法讀取。');
      }
    }

    async function enableDeviceReminder(){
      var auth = headers(true);
      if(!auth){
        render('signed_out', '登入後，才能把提醒綁定到這台裝置。');
        return;
      }
      render('loading', '正在開啟裝置提醒…');
      try{
        var permission = await win.Notification.requestPermission();
        if(permission !== 'granted'){
          render('blocked', '通知未開啟。可在裝置設定中重新允許。');
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
        var response = await fetchFn(apiBase + '/api/me/web-push-subscriptions', {
          method:'POST', headers:auth, body:JSON.stringify(subscription.toJSON()),
        });
        if(!response.ok) throw new Error('subscription save failed');
        render('enabled', '這台裝置已開啟。每天 20:00 後，有複習到期才提醒。');
      }catch(_error){
        render('error', '裝置提醒暫時無法開啟，請稍後再試。');
      }
    }

    async function disableDeviceReminder(){
      var auth = headers(true);
      if(!auth) return render('signed_out', '登入後，才能調整這台裝置的提醒。');
      render('loading', '正在關閉裝置提醒…');
      try{
        var reg = await registration();
        var subscription = await reg.pushManager.getSubscription();
        if(subscription){
          var response = await fetchFn(apiBase + '/api/me/web-push-subscriptions', {
            method:'DELETE', headers:auth, body:JSON.stringify({endpoint:subscription.endpoint}),
          });
          if(!response.ok) throw new Error('subscription delete failed');
          await subscription.unsubscribe();
        }
        render('ready', '這台裝置已關閉。複習進度仍會保留。');
      }catch(_error){
        render('enabled', '暫時無法關閉，這台裝置仍保留提醒。');
      }
    }

    return {init:init, enableDeviceReminder:enableDeviceReminder, disableDeviceReminder:disableDeviceReminder};
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
    urlBase64ToUint8Array:urlBase64ToUint8Array,
  };
});
