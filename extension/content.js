// x-com.fun importer — content script
// Runs on https://x.com/i/communities/* and provides two modes:
//  1. One-shot scan of currently visible tweets (debug button in popup).
//  2. Auto-import: scrolls down at human pace, accumulates unique tweets,
//     and reports progress to the popup until no new tweets appear.
//
// No network calls yet — accumulated tweets stay in this script's memory
// and can be inspected from the popup. The next iteration will POST
// batches to x-com.fun's /api/import/community-tweets endpoint.

(function () {
  "use strict";

  const TAG = "[xcom-fun]";
  const log = (...args) => console.log(TAG, ...args);
  const warn = (...args) => console.warn(TAG, ...args);

  // ── Tunables ──────────────────────────────────────────────────────────

  const SCROLL_DELAY_MIN_MS = 3_000;
  const SCROLL_DELAY_MAX_MS = 5_000;
  const EMPTY_PASS_DELAY_MS = 8_000;       // after a pass with 0 new tweets
  const THROTTLE_BACKOFF_MS = 90_000;      // after a throttle signal
  const STOP_AFTER_EMPTY_PASSES = 4;       // give up after N consecutive empty passes
  const SCROLL_FRACTION = 0.85;            // fraction of viewport per scroll
  const BATCH_SIZE = 50;                   // send to backend every N unsent tweets
  const TOKEN_STORAGE_KEY = "xcomFunImportToken";

  // ── DOM extraction ────────────────────────────────────────────────────

  const getTextContent = (node) =>
    (node?.textContent || "").replace(/\s+/g, " ").trim();

  function parseCompactNumber(raw) {
    if (!raw) return null;
    const cleaned = raw.replace(/,/g, "").trim();
    if (!cleaned) return null;
    const match = cleaned.match(/^([\d.]+)\s*([KMB])?$/i);
    if (!match) return null;
    const num = parseFloat(match[1]);
    if (Number.isNaN(num)) return null;
    const suffix = match[2]?.toUpperCase();
    if (suffix === "K") return Math.round(num * 1_000);
    if (suffix === "M") return Math.round(num * 1_000_000);
    if (suffix === "B") return Math.round(num * 1_000_000_000);
    return Math.round(num);
  }

  function parseEngagementCount(button) {
    if (!button) return null;
    const aria = button.getAttribute("aria-label") || "";
    const ariaMatch = aria.match(/^([\d,.]+\s*[KMB]?)/i);
    if (ariaMatch) {
      const parsed = parseCompactNumber(ariaMatch[1]);
      if (parsed !== null) return parsed;
    }
    const visible =
      button.querySelector('[data-testid="app-text-transition-container"]')
        ?.textContent || button.textContent || "";
    return parseCompactNumber(visible);
  }

  function extractAuthorBlock(article) {
    const userNameEl = article.querySelector('[data-testid="User-Name"]');
    if (!userNameEl) return null;

    let displayName = "";
    let handle = "";
    let permalink = "";

    const anchors = userNameEl.querySelectorAll("a[role='link']");
    for (const a of anchors) {
      const text = getTextContent(a);
      if (text.startsWith("@") && !handle) {
        handle = text.replace(/^@/, "");
      } else if (text && !displayName && !text.startsWith("@")) {
        displayName = text;
      }
      if (a.href && a.href.includes("/status/") && !permalink) {
        permalink = a.href;
      }
    }

    return { displayName, handle, permalink };
  }

  function extractAvatarUrl(article) {
    const img = article.querySelector(
      'img[src*="pbs.twimg.com/profile_images"], img[src*="profile_images"]',
    );
    return img?.src || "";
  }

  function extractBody(article) {
    const el = article.querySelector('[data-testid="tweetText"]');
    return getTextContent(el);
  }

  function extractTimestamp(article) {
    return article.querySelector("time[datetime]")?.getAttribute("datetime") || "";
  }

  function extractMedia(article) {
    const out = [];
    const seen = new Set();

    article.querySelectorAll('img[src*="pbs.twimg.com/media"]').forEach((img) => {
      if (!seen.has(img.src)) {
        seen.add(img.src);
        out.push({ kind: "image", url: img.src });
      }
    });

    article.querySelectorAll("video").forEach((video) => {
      const src = video.querySelector("source")?.src || video.src || video.poster || "";
      if (src && !seen.has(src)) {
        seen.add(src);
        out.push({ kind: "video", url: src });
      }
    });

    return out;
  }

  function parseArticle(article) {
    const author = extractAuthorBlock(article);
    if (!author?.handle) return null;

    const idMatch = author.permalink.match(/\/status\/(\d+)/);
    const externalTweetId = idMatch ? idMatch[1] : "";
    if (!externalTweetId) return null;

    const body = extractBody(article);
    const media = extractMedia(article);
    if (!body && media.length === 0) return null;

    const postedAt = extractTimestamp(article);
    if (!postedAt) return null;

    return {
      externalTweetId,
      authorHandle: author.handle,
      authorDisplayName: author.displayName || author.handle,
      authorAvatarUrl: extractAvatarUrl(article),
      body,
      media,
      postedAt,
      likes: parseEngagementCount(article.querySelector('button[data-testid="like"]')),
      reposts: parseEngagementCount(article.querySelector('button[data-testid="retweet"]')),
    };
  }

  function extractVisibleTweets() {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const tweets = [];
    let parseFailures = 0;

    articles.forEach((article) => {
      try {
        const parsed = parseArticle(article);
        if (parsed) tweets.push(parsed);
        else parseFailures += 1;
      } catch (e) {
        warn("parse error", e);
        parseFailures += 1;
      }
    });

    return {
      tweets,
      stats: {
        articlesFound: articles.length,
        parsed: tweets.length,
        parseFailures,
      },
    };
  }

  // ── Throttle detection ────────────────────────────────────────────────

  function detectThrottleSignal() {
    const txt = document.body.textContent || "";
    if (/Something went wrong\.?\s*Try reloading/i.test(txt)) return "error_banner";
    if (/Rate limit exceeded/i.test(txt)) return "rate_limit";
    if (/You are over the limit for tweets/i.test(txt)) return "tweet_limit";
    return null;
  }

  // ── Auto-import state machine ─────────────────────────────────────────

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const jitter = (min, max) => min + Math.random() * (max - min);

  // Module-level state. Survives between popup opens (popup queries it via
  // GET_STATE), but resets when the page is reloaded.
  let state = createIdleState();

  function createIdleState() {
    return {
      running: false,
      accumulated: new Map(), // externalTweetId -> tweet
      sent: new Set(), // externalTweetIds that were successfully POSTed
      sendErrors: [], // last few send errors, for surfacing in popup
      lastSendError: null,
      passes: 0,
      emptyPasses: 0,
      throttled: false,
      throttleReason: null,
      completion: null, // null while running; "done" | "throttled" | "stopped"
      startedAt: null,
      lastPassAt: null,
      token: null,
    };
  }

  function snapshot() {
    return {
      running: state.running,
      accumulated: state.accumulated.size,
      sent: state.sent.size,
      passes: state.passes,
      emptyPasses: state.emptyPasses,
      throttled: state.throttled,
      throttleReason: state.throttleReason,
      completion: state.completion,
      startedAt: state.startedAt,
      lastPassAt: state.lastPassAt,
      lastSendError: state.lastSendError,
      hasToken: Boolean(state.token),
      sampleTweets: Array.from(state.accumulated.values()).slice(-3),
    };
  }

  function broadcast() {
    chrome.runtime
      .sendMessage({ type: "XCOM_FUN_PROGRESS", ...snapshot() })
      .catch(() => {
        // popup probably closed — ignore
      });
  }

  async function loadToken() {
    try {
      const stored = await chrome.storage.local.get(TOKEN_STORAGE_KEY);
      return stored?.[TOKEN_STORAGE_KEY] || null;
    } catch (e) {
      warn("Failed to read token from storage", e);
      return null;
    }
  }

  async function flushBatch({ force = false } = {}) {
    if (!state.token) return;
    const unsent = [];
    for (const tweet of state.accumulated.values()) {
      if (!state.sent.has(tweet.externalTweetId)) {
        unsent.push(tweet);
        if (unsent.length >= BATCH_SIZE) break;
      }
    }
    if (!unsent.length) return;
    if (!force && unsent.length < BATCH_SIZE) return;

    const result = await chrome.runtime
      .sendMessage({
        type: "XCOM_FUN_SEND_BATCH",
        tweets: unsent,
        token: state.token,
      })
      .catch((e) => ({ ok: false, error: String(e?.message || e) }));

    if (result?.ok) {
      for (const t of unsent) state.sent.add(t.externalTweetId);
      log(
        `Batch OK: imported=${result.imported} duplicates=${result.duplicates} total=${result.total}`,
      );
      state.lastSendError = null;
    } else {
      state.lastSendError = result?.error || "unknown";
      state.sendErrors.push(state.lastSendError);
      if (state.sendErrors.length > 5) state.sendErrors.shift();
      warn("Batch send failed:", state.lastSendError);
      // 401 means the token is dead — stop the import
      if (result?.status === 401 || /token/i.test(state.lastSendError)) {
        state.running = false;
        state.completion = "auth_failed";
      }
    }
    broadcast();
  }

  async function runAutoImport() {
    state.running = true;
    state.startedAt = new Date().toISOString();
    state.token = await loadToken();
    log(
      state.token
        ? "Auto-import started with token — will POST batches."
        : "Auto-import started without token — accumulating locally only.",
    );

    try {
      while (state.running) {
        // Detect throttle before scrolling
        const signal = detectThrottleSignal();
        if (signal) {
          state.throttled = true;
          state.throttleReason = signal;
          warn("Throttle signal:", signal, "— backing off");
          broadcast();
          await sleep(THROTTLE_BACKOFF_MS);
          if (!state.running) break;
          if (detectThrottleSignal()) {
            state.completion = "throttled";
            break;
          }
          state.throttled = false;
          state.throttleReason = null;
        }

        // Parse current viewport
        const before = state.accumulated.size;
        const { tweets } = extractVisibleTweets();
        for (const t of tweets) {
          if (!state.accumulated.has(t.externalTweetId)) {
            state.accumulated.set(t.externalTweetId, t);
          }
        }
        const newCount = state.accumulated.size - before;

        state.passes += 1;
        state.lastPassAt = new Date().toISOString();
        if (newCount === 0) {
          state.emptyPasses += 1;
        } else {
          state.emptyPasses = 0;
        }

        log(
          `pass=${state.passes} new=${newCount} total=${state.accumulated.size} sent=${state.sent.size} emptyPasses=${state.emptyPasses}`,
        );

        // Send a batch if we've accumulated enough new tweets
        await flushBatch();
        if (!state.running) break; // flushBatch may have set running=false on auth fail

        broadcast();

        // Stop if no new tweets after several empty passes
        if (state.emptyPasses >= STOP_AFTER_EMPTY_PASSES) {
          state.completion = "done";
          break;
        }

        // Scroll down
        window.scrollBy({
          top: window.innerHeight * SCROLL_FRACTION,
          behavior: "smooth",
        });

        // Wait — longer when no progress (gives X time to load + looks more human)
        const delay =
          state.emptyPasses > 0
            ? EMPTY_PASS_DELAY_MS + Math.random() * 2_000
            : jitter(SCROLL_DELAY_MIN_MS, SCROLL_DELAY_MAX_MS);
        await sleep(delay);
      }
    } catch (e) {
      warn("Auto-import error:", e);
      state.completion = "error";
    } finally {
      state.running = false;
      // Final flush of any remaining unsent tweets
      try {
        await flushBatch({ force: true });
      } catch (e) {
        warn("Final flush failed:", e);
      }
      log(
        `Auto-import finished: completion=${state.completion} total=${state.accumulated.size} sent=${state.sent.size} passes=${state.passes}`,
      );
      broadcast();
    }
  }

  // ── Message bridge ────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "XCOM_FUN_PING") {
      sendResponse({ ok: true, url: location.href });
      return true;
    }

    if (message?.type === "XCOM_FUN_SCAN_NOW") {
      const result = extractVisibleTweets();
      log(
        `Scan: found ${result.stats.articlesFound} articles, parsed ${result.stats.parsed}, failed ${result.stats.parseFailures}`,
      );
      sendResponse({ ok: true, ...result });
      return true;
    }

    if (message?.type === "XCOM_FUN_GET_STATE") {
      sendResponse({ ok: true, ...snapshot() });
      return true;
    }

    if (message?.type === "XCOM_FUN_START_IMPORT") {
      if (state.running) {
        sendResponse({ ok: false, error: "Already running" });
        return true;
      }
      state = createIdleState();
      runAutoImport();
      sendResponse({ ok: true });
      return true;
    }

    if (message?.type === "XCOM_FUN_STOP_IMPORT") {
      if (state.running) {
        state.running = false;
        state.completion = "stopped";
      }
      sendResponse({ ok: true, ...snapshot() });
      return true;
    }

    if (message?.type === "XCOM_FUN_DUMP") {
      sendResponse({
        ok: true,
        tweets: Array.from(state.accumulated.values()),
      });
      return true;
    }

    if (message?.type === "XCOM_FUN_SET_TOKEN") {
      const token = (message.token || "").trim();
      if (token) {
        chrome.storage.local
          .set({ [TOKEN_STORAGE_KEY]: token })
          .then(() => sendResponse({ ok: true }))
          .catch((e) =>
            sendResponse({ ok: false, error: String(e?.message || e) }),
          );
      } else {
        chrome.storage.local
          .remove(TOKEN_STORAGE_KEY)
          .then(() => sendResponse({ ok: true, cleared: true }))
          .catch((e) =>
            sendResponse({ ok: false, error: String(e?.message || e) }),
          );
      }
      return true; // async
    }

    if (message?.type === "XCOM_FUN_GET_TOKEN_STATUS") {
      loadToken().then((token) =>
        sendResponse({ ok: true, hasToken: Boolean(token) }),
      );
      return true;
    }
  });

  log("Content script ready on", location.href);
})();
