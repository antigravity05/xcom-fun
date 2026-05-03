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
      passes: 0,
      emptyPasses: 0,
      throttled: false,
      throttleReason: null,
      completion: null, // null while running; "done" | "throttled" | "stopped"
      startedAt: null,
      lastPassAt: null,
    };
  }

  function snapshot() {
    return {
      running: state.running,
      accumulated: state.accumulated.size,
      passes: state.passes,
      emptyPasses: state.emptyPasses,
      throttled: state.throttled,
      throttleReason: state.throttleReason,
      completion: state.completion,
      startedAt: state.startedAt,
      lastPassAt: state.lastPassAt,
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

  async function runAutoImport() {
    state.running = true;
    state.startedAt = new Date().toISOString();
    log("Auto-import started.");

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
          `pass=${state.passes} new=${newCount} total=${state.accumulated.size} emptyPasses=${state.emptyPasses}`,
        );
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
      log(
        `Auto-import finished: completion=${state.completion} total=${state.accumulated.size} passes=${state.passes}`,
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
  });

  log("Content script ready on", location.href);
})();
