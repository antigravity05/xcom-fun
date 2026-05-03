// x-com.fun importer — content script (POC)
// Runs on https://x.com/i/communities/* and extracts visible tweets from
// the DOM when prompted. No network calls in the POC — everything is
// returned to the popup which logs it for inspection.

(function () {
  "use strict";

  const TAG = "[xcom-fun]";
  const log = (...args) => console.log(TAG, ...args);
  const warn = (...args) => console.warn(TAG, ...args);

  // ── DOM extraction ────────────────────────────────────────────────────

  function getTextContent(node) {
    return (node?.textContent || "").replace(/\s+/g, " ").trim();
  }

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
    const ariaLabel = button.getAttribute("aria-label") || "";
    // Try aria-label first ("123 likes")
    const ariaMatch = ariaLabel.match(/^([\d,.]+\s*[KMB]?)/i);
    if (ariaMatch) {
      const parsed = parseCompactNumber(ariaMatch[1]);
      if (parsed !== null) return parsed;
    }
    // Fallback: visible text inside the button
    const visibleText =
      button.querySelector('[data-testid="app-text-transition-container"]')
        ?.textContent || button.textContent || "";
    return parseCompactNumber(visibleText);
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
    const avatarImg = article.querySelector(
      'img[src*="profile_images"], img[src*="pbs.twimg.com/profile_images"]',
    );
    return avatarImg?.src || "";
  }

  function extractBody(article) {
    const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
    return getTextContent(tweetTextEl);
  }

  function extractTimestamp(article) {
    const timeEl = article.querySelector("time[datetime]");
    return timeEl?.getAttribute("datetime") || "";
  }

  function extractMedia(article) {
    const out = [];
    const seen = new Set();

    // Images: tweet photos use pbs.twimg.com/media URLs
    article
      .querySelectorAll('img[src*="pbs.twimg.com/media"]')
      .forEach((img) => {
        const url = img.src;
        if (!seen.has(url)) {
          seen.add(url);
          out.push({ kind: "image", url });
        }
      });

    // Videos: <video> elements have <source> children or a poster
    article.querySelectorAll("video").forEach((video) => {
      const sourceUrl =
        video.querySelector("source")?.src || video.src || video.poster || "";
      if (sourceUrl && !seen.has(sourceUrl)) {
        seen.add(sourceUrl);
        out.push({ kind: "video", url: sourceUrl });
      }
    });

    return out;
  }

  function parseArticle(article) {
    const author = extractAuthorBlock(article);
    if (!author || !author.handle) return null;

    const idMatch = author.permalink.match(/\/status\/(\d+)/);
    const externalTweetId = idMatch ? idMatch[1] : "";
    if (!externalTweetId) return null;

    const body = extractBody(article);
    const media = extractMedia(article);
    if (!body && media.length === 0) return null;

    const postedAt = extractTimestamp(article);
    if (!postedAt) return null;

    const likeButton = article.querySelector('button[data-testid="like"]');
    const repostButton = article.querySelector(
      'button[data-testid="retweet"]',
    );

    return {
      externalTweetId,
      authorHandle: author.handle,
      authorDisplayName: author.displayName || author.handle,
      authorAvatarUrl: extractAvatarUrl(article),
      body,
      media,
      postedAt,
      likes: parseEngagementCount(likeButton),
      reposts: parseEngagementCount(repostButton),
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
        warn("Failed to parse article", e);
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

  // ── Message bridge with the popup ─────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "XCOM_FUN_SCAN_NOW") {
      const result = extractVisibleTweets();
      log(
        `Scan: found ${result.stats.articlesFound} articles, parsed ${result.stats.parsed}, failed ${result.stats.parseFailures}`,
      );
      log("Sample tweet:", result.tweets[0]);
      sendResponse({ ok: true, ...result });
      return true;
    }

    if (message?.type === "XCOM_FUN_PING") {
      sendResponse({ ok: true, url: location.href });
      return true;
    }
  });

  log("Content script ready on", location.href);
})();
