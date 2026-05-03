const $ = (id) => document.getElementById(id);

const startButton = $("start");
const stopButton = $("stop");
const scanNowButton = $("scan-now");
const dumpButton = $("dump");
const subEl = $("sub");
const countEl = $("count");
const passesEl = $("passes");
const statusPillEl = $("status-pill");
const statusEl = $("status");
const hintEl = $("hint");
const outputEl = $("output");

let activeTabId = null;
let pollTimer = null;

const PILL_LABELS = {
  idle: "Idle",
  running: "Running",
  done: "Done",
  throttled: "Throttled",
  stopped: "Stopped",
  error: "Error",
};

const showHint = (msg) => {
  hintEl.textContent = msg;
  hintEl.style.display = "block";
};

const hideHint = () => {
  hintEl.style.display = "none";
};

const setStatus = (text, level = "") => {
  statusEl.className = "status" + (level ? " " + level : "");
  statusEl.textContent = text;
};

const renderPill = (kind) => {
  const label = PILL_LABELS[kind] || kind;
  statusPillEl.innerHTML = `<span class="pill ${kind}">${label}</span>`;
};

const formatRelativeTime = (iso) => {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return new Date(iso).toLocaleTimeString();
};

const renderState = (state) => {
  countEl.textContent = String(state.accumulated ?? 0);
  passesEl.textContent = String(state.passes ?? 0);

  let pillKind = "idle";
  if (state.running) pillKind = state.throttled ? "throttled" : "running";
  else if (state.completion === "done") pillKind = "done";
  else if (state.completion === "throttled") pillKind = "throttled";
  else if (state.completion === "stopped") pillKind = "stopped";
  else if (state.completion === "error") pillKind = "error";
  renderPill(pillKind);

  if (state.running) {
    startButton.style.display = "none";
    stopButton.style.display = "block";
  } else {
    startButton.style.display = "block";
    stopButton.style.display = "none";
    startButton.disabled = false;
    startButton.textContent =
      state.accumulated > 0 ? "Restart import" : "Start auto-import";
  }

  if (state.running) {
    if (state.throttled) {
      setStatus(
        `X is throttling — backing off (reason: ${state.throttleReason || "?"}).`,
        "warn",
      );
    } else if (state.lastPassAt) {
      setStatus(`Last scroll ${formatRelativeTime(state.lastPassAt)}.`);
    } else {
      setStatus("Running…");
    }
  } else if (state.completion === "done") {
    setStatus(
      `Done. ${state.accumulated} tweets collected over ${state.passes} passes.`,
      "ok",
    );
  } else if (state.completion === "throttled") {
    setStatus(
      "Stopped — X is rate-limiting this account. Wait 30 min and retry.",
      "warn",
    );
  } else if (state.completion === "stopped") {
    setStatus(
      `Stopped manually. ${state.accumulated} tweets collected so far.`,
    );
  } else {
    setStatus("Ready.");
  }
};

const sendToTab = async (msg) => {
  if (!activeTabId) return null;
  try {
    return await chrome.tabs.sendMessage(activeTabId, msg);
  } catch (e) {
    return null;
  }
};

const refreshState = async () => {
  const state = await sendToTab({ type: "XCOM_FUN_GET_STATE" });
  if (state?.ok) renderState(state);
};

const startPolling = () => {
  if (pollTimer) return;
  pollTimer = setInterval(refreshState, 1000);
};

const stopPolling = () => {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
};

// ── Event listeners ────────────────────────────────────────────────────

startButton.addEventListener("click", async () => {
  hideHint();
  outputEl.style.display = "none";
  if (!activeTabId) {
    showHint("Open an X community page first.");
    return;
  }
  startButton.disabled = true;
  const res = await sendToTab({ type: "XCOM_FUN_START_IMPORT" });
  if (!res?.ok) {
    setStatus(res?.error || "Could not start import.", "error");
    startButton.disabled = false;
    return;
  }
  await refreshState();
});

stopButton.addEventListener("click", async () => {
  await sendToTab({ type: "XCOM_FUN_STOP_IMPORT" });
  await refreshState();
});

scanNowButton.addEventListener("click", async () => {
  if (!activeTabId) return;
  hideHint();
  const res = await sendToTab({ type: "XCOM_FUN_SCAN_NOW" });
  if (!res?.ok) {
    setStatus("Scan failed.", "error");
    return;
  }
  setStatus(
    `Scan: ${res.stats.parsed}/${res.stats.articlesFound} parsed (${res.stats.parseFailures} failed).`,
  );
  outputEl.textContent = JSON.stringify(res.tweets.slice(0, 3), null, 2);
  outputEl.style.display = "block";
});

dumpButton.addEventListener("click", async () => {
  const res = await sendToTab({ type: "XCOM_FUN_DUMP" });
  if (!res?.ok) {
    setStatus("Nothing to dump.", "error");
    return;
  }
  setStatus(`Dumped ${res.tweets.length} tweets to console + popup.`);
  console.log("[xcom-fun popup] Dumped tweets:", res.tweets);
  outputEl.textContent = JSON.stringify(res.tweets.slice(0, 5), null, 2);
  outputEl.style.display = "block";
});

// Live progress messages from the content script
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "XCOM_FUN_PROGRESS") {
    renderState(message);
  }
});

// ── Init ───────────────────────────────────────────────────────────────

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || "";
  if (!url.includes("/i/communities/")) {
    activeTabId = null;
    subEl.textContent = "Open https://x.com/i/communities/… and reopen this popup.";
    startButton.disabled = true;
    scanNowButton.disabled = true;
    dumpButton.disabled = true;
    return;
  }
  activeTabId = tab.id;
  subEl.textContent = "Connected to X community tab.";
  await refreshState();
  startPolling();
})();

window.addEventListener("unload", stopPolling);
