# x-com.fun importer (POC)

Chrome extension that extracts tweets from an X community page DOM. POC version — no network calls, just logs what it can parse so we can validate selector stability before building the full import pipeline.

## Install (developer mode)

1. Open `chrome://extensions` in Chrome.
2. Toggle **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select this `extension/` folder.
5. The icon should appear in the toolbar.

## Test

1. Navigate to a real X community, e.g. `https://x.com/i/communities/1960444559428587821`.
2. Wait for the feed to load.
3. Click the extension icon → **Scan visible tweets**.
4. The popup shows counts (Found / Parsed / Failed) and a JSON preview of the first 3 tweets.
5. Open DevTools console on the X tab — every scan logs `[xcom-fun]` lines with detail.

## What we're validating

- `article[data-testid="tweet"]` is still the stable container selector.
- `[data-testid="User-Name"]`, `[data-testid="tweetText"]`, `time[datetime]`, `[data-testid="like"]`, `[data-testid="retweet"]` all work for extraction.
- We can pull author handle, display name, avatar, body, timestamp, media URLs, engagement counts.

If the parsed count is meaningfully lower than the found count, the parsers need adjustment. If found count is 0, the article selector itself is broken and the approach needs rethinking.

## Files

- `manifest.json` — MV3 manifest (host permissions on x.com only).
- `content.js` — DOM extractor injected on community pages.
- `popup.html` / `popup.js` — UI to trigger a scan and inspect results.
