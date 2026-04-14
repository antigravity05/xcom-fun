/**
 * X/Twitter-style rich text formatters using Unicode Mathematical
 * Alphanumeric Symbols (U+1D400 – U+1D7FF).
 *
 * These are NOT real markdown — they're codepoint substitutions that
 * survive the round-trip to X because no markup is stripped.
 * Accessibility caveat: screen readers may read them awkwardly.
 */

// Codepoint offsets for Unicode Mathematical Alphanumeric Symbols
const BOLD_UPPER = 0x1d400 - 0x41; // 'A'..'Z' -> 𝐀..𝐙
const BOLD_LOWER = 0x1d41a - 0x61; // 'a'..'z' -> 𝐚..𝐳
const BOLD_DIGIT = 0x1d7ce - 0x30; // '0'..'9' -> 𝟎..𝟗

const ITALIC_UPPER = 0x1d434 - 0x41; // 'A'..'Z' -> 𝐴..𝑍
const ITALIC_LOWER = 0x1d44e - 0x61; // 'a'..'z' -> 𝑎..𝑧

// Reverse lookup ranges
const BOLD_UPPER_START = 0x1d400;
const BOLD_UPPER_END = 0x1d419;
const BOLD_LOWER_START = 0x1d41a;
const BOLD_LOWER_END = 0x1d433;
const BOLD_DIGIT_START = 0x1d7ce;
const BOLD_DIGIT_END = 0x1d7d7;

const ITALIC_UPPER_START = 0x1d434;
const ITALIC_UPPER_END = 0x1d44d;
const ITALIC_LOWER_START = 0x1d44e;
const ITALIC_LOWER_END = 0x1d467;

const ITALIC_H_SPECIAL = 0x210e; // ℎ (PLANCK CONSTANT) — italic 'h' has no math-italic codepoint

// ── Encode ──

export const toBold = (text: string): string =>
  [...text]
    .map((ch) => {
      const code = ch.codePointAt(0);
      if (code === undefined) return ch;
      if (code >= 0x41 && code <= 0x5a) return String.fromCodePoint(code + BOLD_UPPER);
      if (code >= 0x61 && code <= 0x7a) return String.fromCodePoint(code + BOLD_LOWER);
      if (code >= 0x30 && code <= 0x39) return String.fromCodePoint(code + BOLD_DIGIT);
      return ch;
    })
    .join("");

export const toItalic = (text: string): string =>
  [...text]
    .map((ch) => {
      const code = ch.codePointAt(0);
      if (code === undefined) return ch;
      if (ch === "h") return String.fromCodePoint(ITALIC_H_SPECIAL);
      if (code >= 0x41 && code <= 0x5a) return String.fromCodePoint(code + ITALIC_UPPER);
      if (code >= 0x61 && code <= 0x7a) return String.fromCodePoint(code + ITALIC_LOWER);
      return ch;
    })
    .join("");

// ── Decode (for toggle) ──

export const fromBold = (text: string): string =>
  [...text]
    .map((ch) => {
      const code = ch.codePointAt(0);
      if (code === undefined) return ch;
      if (code >= BOLD_UPPER_START && code <= BOLD_UPPER_END)
        return String.fromCodePoint(code - BOLD_UPPER);
      if (code >= BOLD_LOWER_START && code <= BOLD_LOWER_END)
        return String.fromCodePoint(code - BOLD_LOWER);
      if (code >= BOLD_DIGIT_START && code <= BOLD_DIGIT_END)
        return String.fromCodePoint(code - BOLD_DIGIT);
      return ch;
    })
    .join("");

export const fromItalic = (text: string): string =>
  [...text]
    .map((ch) => {
      const code = ch.codePointAt(0);
      if (code === undefined) return ch;
      if (code === ITALIC_H_SPECIAL) return "h";
      if (code >= ITALIC_UPPER_START && code <= ITALIC_UPPER_END)
        return String.fromCodePoint(code - ITALIC_UPPER);
      if (code >= ITALIC_LOWER_START && code <= ITALIC_LOWER_END)
        return String.fromCodePoint(code - ITALIC_LOWER);
      return ch;
    })
    .join("");

// ── Detect (for toggle logic) ──

/** Returns true if at least one char in `text` is Unicode math bold. */
export const isBold = (text: string): boolean =>
  [...text].some((ch) => {
    const code = ch.codePointAt(0);
    if (code === undefined) return false;
    return (
      (code >= BOLD_UPPER_START && code <= BOLD_UPPER_END) ||
      (code >= BOLD_LOWER_START && code <= BOLD_LOWER_END) ||
      (code >= BOLD_DIGIT_START && code <= BOLD_DIGIT_END)
    );
  });

/** Returns true if at least one char in `text` is Unicode math italic. */
export const isItalic = (text: string): boolean =>
  [...text].some((ch) => {
    const code = ch.codePointAt(0);
    if (code === undefined) return false;
    return (
      code === ITALIC_H_SPECIAL ||
      (code >= ITALIC_UPPER_START && code <= ITALIC_UPPER_END) ||
      (code >= ITALIC_LOWER_START && code <= ITALIC_LOWER_END)
    );
  });

// ── Toggle (applied to a textarea selection) ──

export const toggleBold = (text: string): string =>
  isBold(text) ? fromBold(text) : toBold(text);

export const toggleItalic = (text: string): string =>
  isItalic(text) ? fromItalic(text) : toItalic(text);
