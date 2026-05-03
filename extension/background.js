// x-com.fun importer — background service worker
// Proxies network calls between the content script and the x-com.fun API.
// Running fetch from a content script on x.com hits CORS; from a service
// worker with host_permissions on x-com.fun, it doesn't.

const API_BASE = "https://x-com.fun";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "XCOM_FUN_SEND_BATCH") {
    handleSendBatch(message)
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({ ok: false, error: String(error?.message || error) }),
      );
    return true; // async response
  }
});

async function handleSendBatch({ tweets, token }) {
  if (!token) return { ok: false, error: "no_token" };
  if (!Array.isArray(tweets) || tweets.length === 0) {
    return { ok: true, imported: 0, duplicates: 0, total: 0 };
  }

  try {
    const res = await fetch(`${API_BASE}/api/import/community-tweets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tweets }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: `HTTP ${res.status}: ${text.slice(0, 200)}`,
        status: res.status,
      };
    }

    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || `HTTP ${res.status}`,
        status: res.status,
      };
    }

    return {
      ok: true,
      imported: data.imported ?? 0,
      duplicates: data.duplicates ?? 0,
      total: data.total ?? tweets.length,
    };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}
