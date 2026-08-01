(function () {
  "use strict";

  var ELEVENLABS_WS_ORIGIN = "wss://api.elevenlabs.io";
  var ELEVENLABS_WS_PATH = "/v1/convai/conversation";
  var originalFetch = window.fetch.bind(window);

  function isSignedUrlRequest(input) {
    var value = typeof input === "string" ? input : input && input.url;
    if (!value) return false;
    try {
      return new URL(value, window.location.href).pathname === "/api/ai/voice/signed-url";
    } catch (_error) {
      return false;
    }
  }

  function directElevenLabsUrl(value) {
    try {
      var url = new URL(value, window.location.href);
      if (url.pathname !== "/api/ai/voice/ws") return value;
      return ELEVENLABS_WS_ORIGIN + ELEVENLABS_WS_PATH + url.search;
    } catch (_error) {
      return value;
    }
  }

  window.fetch = async function (input, init) {
    var response = await originalFetch(input, init);
    if (!isSignedUrlRequest(input)) return response;

    try {
      var data = await response.clone().json();
      if (data && data.signed_url) {
        data.signed_url = directElevenLabsUrl(data.signed_url);
      }
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } catch (_error) {
      return response;
    }
  };

  var script = document.createElement("script");
  script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
  script.async = true;
  script.type = "text/javascript";
  script.onerror = function () {
    console.error("ElevenLabs voice widget failed to load.");
  };
  document.head.appendChild(script);
})();