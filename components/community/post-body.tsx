import Link from "next/link";

/**
 * Renders post body text with parsed @mentions and #hashtags.
 * - @mentions link to the user's X profile
 * - #hashtags are highlighted in accent color
 * - URLs are rendered as clickable links
 * - Plain text is preserved with whitespace
 */

type PostBodyProps = {
  body: string;
  className?: string;
};

// Regex to match @mentions, #hashtags, $tickers, and URLs
const TOKEN_REGEX =
  /(@[\w]{1,15})|(#[\w]{1,50})|(\$[A-Za-z]{1,12})|(https?:\/\/[^\s<]+)/g;

export const PostBody = ({ body, className = "" }: PostBodyProps) => {
  const parts: Array<{ type: "text" | "mention" | "hashtag" | "ticker" | "url"; value: string }> = [];
  let lastIndex = 0;

  for (const match of body.matchAll(TOKEN_REGEX)) {
    const matchIndex = match.index ?? 0;

    // Add plain text before this match
    if (matchIndex > lastIndex) {
      parts.push({ type: "text", value: body.slice(lastIndex, matchIndex) });
    }

    if (match[1]) {
      parts.push({ type: "mention", value: match[1] });
    } else if (match[2]) {
      parts.push({ type: "hashtag", value: match[2] });
    } else if (match[3]) {
      parts.push({ type: "ticker", value: match[3] });
    } else if (match[4]) {
      parts.push({ type: "url", value: match[4] });
    }

    lastIndex = matchIndex + match[0].length;
  }

  // Add remaining text
  if (lastIndex < body.length) {
    parts.push({ type: "text", value: body.slice(lastIndex) });
  }

  // If no special tokens found, render plain text
  if (parts.length === 0) {
    return (
      <div className={`whitespace-pre-line ${className}`}>
        {body}
      </div>
    );
  }

  return (
    <div className={`whitespace-pre-line ${className}`}>
      {parts.map((part, i) => {
        switch (part.type) {
          case "mention":
            return (
              <a
                key={i}
                href={`https://x.com/${part.value.slice(1)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-secondary hover:underline"
              >
                {part.value}
              </a>
            );
          case "hashtag":
            return (
              <span
                key={i}
                className="text-accent-secondary"
              >
                {part.value}
              </span>
            );
          case "ticker":
            return (
              <span
                key={i}
                className="font-semibold text-accent-secondary"
              >
                {part.value}
              </span>
            );
          case "url": {
            // Clean display URL: remove protocol, trailing slash
            const displayUrl = part.value
              .replace(/^https?:\/\//, "")
              .replace(/\/$/, "");
            return (
              <a
                key={i}
                href={part.value}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-secondary hover:underline"
              >
                {displayUrl.length > 40
                  ? `${displayUrl.slice(0, 37)}...`
                  : displayUrl}
              </a>
            );
          }
          default:
            return <span key={i}>{part.value}</span>;
        }
      })}
    </div>
  );
};
