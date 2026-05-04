// x-com.fun importer — bridge content script
// Runs on https://x-com.fun/* and listens for postMessage from the
// /migrate wizard page. When the wizard issues an import token, it
// posts it to the window; we forward it to chrome.storage.local where
// the import content script (running on x.com) reads it.

(function () {
  "use strict";

  const TAG = "[xcom-fun bridge]";
  const TOKEN_STORAGE_KEY = "xcomFunImportToken";
  const ORIGIN_STORAGE_KEY = "xcomFunOrigin";

  window.addEventListener("message", (event) => {
    // Only accept messages from the same window/origin as us.
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.source !== "xcom-fun") return;

    if (data.type === "IMPORT_TOKEN") {
      const token = typeof data.token === "string" ? data.token.trim() : "";
      if (!token) return;
      // Store the canonical origin alongside the token so the background
      // worker hits the same hostname the user actually browses (avoids
      // cross-origin redirects that strip the Authorization header).
      chrome.storage.local
        .set({
          [TOKEN_STORAGE_KEY]: token,
          [ORIGIN_STORAGE_KEY]: window.location.origin,
        })
        .then(() => {
          console.log(
            TAG,
            "Token stored for origin",
            window.location.origin,
            "— importer ready.",
          );
          // Acknowledge so the wizard can advance its UI.
          window.postMessage(
            { source: "xcom-fun-extension", type: "IMPORT_TOKEN_ACK" },
            window.location.origin,
          );
        })
        .catch((e) => console.warn(TAG, "Failed to store token", e));
    } else if (data.type === "PING_EXTENSION") {
      // Used by the wizard to check whether the extension is installed.
      window.postMessage(
        { source: "xcom-fun-extension", type: "PONG" },
        window.location.origin,
      );
    }
  });

  // Announce presence on page load so the wizard knows the extension is
  // already installed without having to send a ping first.
  window.postMessage(
    { source: "xcom-fun-extension", type: "READY" },
    window.location.origin,
  );

  console.log(TAG, "Ready on", location.href);
})();
