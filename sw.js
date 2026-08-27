'use strict';

var DEFAULT_REVIEW_URL = '/dashboard.html#review-due';

function safeReviewUrl(raw){
  try{
    var url = new URL(raw || DEFAULT_REVIEW_URL, self.location.origin);
    if(url.origin !== self.location.origin) return new URL(DEFAULT_REVIEW_URL, self.location.origin).href;
    if(url.pathname !== '/dashboard.html') return new URL(DEFAULT_REVIEW_URL, self.location.origin).href;
    if(url.hash !== '#review-due') return new URL(DEFAULT_REVIEW_URL, self.location.origin).href;
    return url.href;
  }catch(_error){
    return new URL(DEFAULT_REVIEW_URL, self.location.origin).href;
  }
}

self.addEventListener('push', function(event){
  var payload = {};
  try{ payload = event.data ? event.data.json() : {}; }catch(_error){ payload = {}; }
  var today = new Date().toISOString().slice(0,10);
  var title = typeof payload.title === 'string' ? payload.title : 'SoFa｜今日複習';
  var options = {
    body: typeof payload.body === 'string' ? payload.body : '複習已經到期。今天先看一條就好。',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: typeof payload.tag === 'string' ? payload.tag : 'sofa-review-' + today,
    renotify: false,
    data: {url:safeReviewUrl(payload.url)},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  var target = safeReviewUrl(event.notification && event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(windowClients){
      var sameOrigin = windowClients.find(function(client){
        try{ return new URL(client.url).origin === self.location.origin; }catch(_error){ return false; }
      });
      if(sameOrigin){
        var navigation = typeof sameOrigin.navigate === 'function' ? sameOrigin.navigate(target) : Promise.resolve(sameOrigin);
        return navigation.then(function(client){
          client = client || sameOrigin;
          return client.focus();
        });
      }
      return self.clients.openWindow(target);
    })
  );
});
