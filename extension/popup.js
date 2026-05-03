const $ = (id) => document.getElementById(id);

const startButton = $("start");
const stopButton = $("stop");
const scanNowButton = $("scan-now");
const dumpButton = $("dump");
const subEl = $("sub");
const accumulatedEl = $("count-accumulated");
const sentEl = $("count-sent");
const passesEl = $("passes");
const statusPillEl = $("status-pill");
const statusEl = $("status");
const hintEl = $("hint");
const outputEl = $("output");
const tokenInputEl = $("token-input");
const tokenSaveButton = $("token-save");
const tokenStatusEl = $("token-status");

let activeTabId = null;
let pollTimer = null;

const PILL_LABELS = {
  idle: "Idle",
  running: "Running",
  done: "Done",
  throttled: "Throttled",
  stopped: "Stopped",
  error: "Error",
  auth_failed: "Auth failed",
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

const renderTokenStatus = (hasToken) => {
  if (hasToken) {
    tokenStatusEl.textContent = "Token set — batches will be sent to x-com.fun.";
    tokenStatusEl.classList.add("has-token");
  } else {
    tokenStatusEl.textContent = "No token set — tweets accumulate locally only.";
    tokenStatusEl.classList.remove("has-token");
  }
};

const renderState = (state) => {
  accumulatedEl.textContent = String(state.accumulated ?? 0);
  sentEl.textContent = String(state.sent ?? 0);
  passesEl.textContent = String(state.passes ?? 0);
  renderTokenStatus(state.hasToken);

  let pillKind = "idle";
  if (state.running) pillKind = state.throttled ? "throttled" : "running";
  else if (state.completion) pillKind = state.completion;
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

  if (state.lastSendError) {
    setStatus(`Send error: ${state.lastSendError}`, "error");
  } else if (state.running) {
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
    const sentText = state.hasToken
      ? `${state.sent} sent to x-com.fun.`
      : "No token set, nothing sent.";
    setStatus(
      `Done. ${state.accumulated} tweets collected over ${state.passes} passes. ${sentText}`,
      "ok",
    );
  } else if (state.completion === "throttled") {
    setStatus(
      "Stopped — X is rate-limiting this account. Wait 30 min and retry.",
      "warn",
    );
  } else if (state.completion === "auth_failed") {
    setStatus(
      "Auth failed — token rejected by x-com.fun. Re-paste a fresh token.",
      "error",
    );
  } else if (state.completion === "stopped") {
    setStatus(
      `Stopped manually. ${state.accumulated} accumulated, ${state.sent} sent.`,
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
  setStatus(`Dumped ${res.tweets.length} tweets to console + popup preview.`);
  console.log("[xcom-fun popup] Dumped tweets:", res.tweets);
  outputEl.textContent = JSON.stringify(res.tweets.slice(0, 5), null, 2);
  outputEl.style.display = "block";
});

tokenSaveButton.addEventListener("click", async () => {
  const token = tokenInputEl.value.trim();
  const res = await sendToTab({ type: "XCOM_FUN_SET_TOKEN", token });
  if (res?.ok) {
    tokenInputEl.value = "";
    if (token) {
      setStatus("Token saved.", "ok");
      renderTokenStatus(true);
    } else {
      setStatus("Token cleared.");
      renderTokenStatus(false);
    }
  } else {
    setStatus(res?.error || "Failed to save token.", "error");
  }
});

tokenInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    tokenSaveButton.click();
  }
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
    // Token can still be checked
    return;
  }
  activeTabId = tab.id;
  subEl.textContent = "Connected to X community tab.";
  await refreshState();
  startPolling();
})();

window.addEventListener("unload", stopPolling);
