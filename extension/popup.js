const scanButton = document.getElementById("scan");
const statusEl = document.getElementById("status");
const statsEl = document.getElementById("stats");
const statFoundEl = document.getElementById("stat-found");
const statParsedEl = document.getElementById("stat-parsed");
const statFailedEl = document.getElementById("stat-failed");
const outputEl = document.getElementById("output");
const hintEl = document.getElementById("hint");

const showHint = (message) => {
  hintEl.textContent = message;
  hintEl.style.display = "block";
};

const hideHint = () => {
  hintEl.style.display = "none";
};

const setStatus = (text) => {
  statusEl.textContent = text;
};

scanButton.addEventListener("click", async () => {
  scanButton.disabled = true;
  hideHint();
  setStatus("Scanning…");
  outputEl.style.display = "none";
  statsEl.style.display = "none";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      showHint("No active tab.");
      setStatus("Idle.");
      return;
    }

    const url = tab.url || "";
    if (!url.includes("/i/communities/")) {
      showHint(
        "Open an X community page (https://x.com/i/communities/…) and try again.",
      );
      setStatus("Idle.");
      return;
    }

    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, {
        type: "XCOM_FUN_SCAN_NOW",
      });
    } catch (e) {
      showHint(
        "Could not reach the content script. Reload the X community tab and try again.",
      );
      setStatus("Idle.");
      return;
    }

    if (!response?.ok) {
      showHint("Scan failed.");
      setStatus("Idle.");
      return;
    }

    const { tweets = [], stats = {} } = response;

    statFoundEl.textContent = String(stats.articlesFound ?? 0);
    statParsedEl.textContent = String(stats.parsed ?? 0);
    statFailedEl.textContent = String(stats.parseFailures ?? 0);
    statsEl.style.display = "grid";

    if (tweets.length === 0) {
      setStatus("No tweets parsed.");
      showHint(
        "DOM might have changed. Check the page console for [xcom-fun] errors.",
      );
      return;
    }

    setStatus(`Parsed ${tweets.length} tweets — preview below.`);
    outputEl.textContent = JSON.stringify(tweets.slice(0, 3), null, 2);
    outputEl.style.display = "block";
  } finally {
    scanButton.disabled = false;
  }
});
