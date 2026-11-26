// Vite HMR is disabled in cloud iFrame environment (DISABLE_HMR=true).
// Shim HMR WebSocket so client does not attempt failing connections.
(function () {
  var OrigWS = window.WebSocket;
  if (OrigWS) {
    function ViteHmrShim(url, protocols) {
      var isHmr =
        (typeof protocols === 'string' && protocols.indexOf('vite-hmr') !== -1) ||
        (Array.isArray(protocols) && protocols.indexOf('vite-hmr') !== -1) ||
        (typeof url === 'string' && (url.indexOf('vite-hmr') !== -1 || url.indexOf('token=') !== -1));
      if (isHmr) {
        var target = new EventTarget();
        target.url = url;
        target.readyState = 1;
        target.OPEN = 1;
        target.CLOSED = 3;
        target.CONNECTING = 0;
        target.CLOSING = 2;
        target.send = function () {};
        target.close = function () {};
        setTimeout(function () {
          target.dispatchEvent(new Event('open'));
        }, 0);
        return target;
      }
      return new OrigWS(url, protocols);
    }
    ViteHmrShim.prototype = OrigWS.prototype;
    ViteHmrShim.CONNECTING = 0;
    ViteHmrShim.OPEN = 1;
    ViteHmrShim.CLOSING = 2;
    ViteHmrShim.CLOSED = 3;
    window.WebSocket = ViteHmrShim;
  }

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event && event.reason;
    if (reason) {
      var msg = reason.message || String(reason);
      if (msg.indexOf('WebSocket') !== -1 || msg.indexOf('closed without opened') !== -1) {
        event.preventDefault();
      }
    }
  });

  var origConsoleError = console.error;
  console.error = function () {
    var args = Array.prototype.slice.call(arguments);
    if (args.length > 0) {
      var str = String(args[0]);
      if (
        str.indexOf('WebSocket') !== -1 ||
        str.indexOf('closed without opened') !== -1 ||
        str.indexOf('[vite] failed to connect') !== -1
      ) {
        return;
      }
    }
    origConsoleError.apply(console, args);
  };
})();
