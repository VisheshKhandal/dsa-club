/**
 * Content Normalization Utility for Mission Learning Reader
 * Handles entity decoding, double-encoding resolution, and format detection.
 */
// window.console.log("Hello")
const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&mdash;": "—",
  "&ndash;": "–",
  "&bull;": "•",
  "&hellip;": "…",
  "&larr;": "←",
  "&rarr;": "→",
  "&check;": "✓",
  "&cross;": "✗",
  "&le;": "≤",
  "&ge;": "≥",
  "&ne;": "≠",
  "&infin;": "∞",
  "&times;": "×",
  "&divide;": "÷",
  "&uarr;": "↑",
  "&darr;": "↓",
  "&harr;": "↔",
  "&rArr;": "⇒",
  "&lArr;": "⇐",
  "&hArr;": "⇔",
  "&minus;": "−",
};

/**
 * Decodes all standard, numeric, and hex HTML entities into readable characters.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== "string") return "";

  // 1. Replace named entities
  let result = text.replace(/&([a-zA-Z0-9#]+);/g, (match) => {
    const lower = match.toLowerCase();
    return NAMED_ENTITIES[lower] ?? match;
  });

  // 2. Replace decimal numeric entities: &#60; -> <
  result = result.replace(/&#(\d+);/g, (_, dec) => {
    const code = parseInt(dec, 10);
    return !isNaN(code) && code > 0 && code < 65536 ? String.fromCharCode(code) : _;
  });

  // 3. Replace hex numeric entities: &#x3c; -> <
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const code = parseInt(hex, 16);
    return !isNaN(code) && code > 0 && code < 65536 ? String.fromCharCode(code) : _;
  });

  return result;
}

/**
 * Detects whether content was saved with escaped or double-escaped HTML tags
 * (e.g. `&lt;h3&gt;` or `&amp;lt;h3&amp;gt;`) and restores real HTML tags.
 */
export function unescapeHtmlIfNeeded(content: string): string {
  if (!content) return "";

  let current = content;

  // If content contains double-escaped entities like `&amp;lt;` or `&amp;gt;`
  if (/&amp;(?:lt|gt|quot|#39|amp);/i.test(current)) {
    current = decodeHtmlEntities(current);
  }

  // Check if escaped tags exist: &lt;h3&gt;, &lt;p&gt;, &lt;div&gt;, &lt;ul&gt;, etc.
  const escapedTagPattern = /&lt;\/?(?:h[1-6]|p|div|ul|ol|li|blockquote|pre|code|strong|em|b|i|a|span|table|tr|th|td)\b[^&]*&gt;/i;
  if (escapedTagPattern.test(current)) {
    current = decodeHtmlEntities(current);
  }

  return current;
}

export type ContentFormat = "html" | "markdown" | "mixed";

/**
 * Determines whether the stored content is HTML, Markdown, or Mixed.
 */
export function detectContentFormat(content: string): ContentFormat {
  if (!content) return "markdown";

  const hasHtmlTags = /<\/?(?:h[1-6]|p|div|ul|ol|li|blockquote|pre|code|strong|em|b|i|a|span|table|tr|th|td|br)\b[^>]*>/i.test(content);
  const hasMarkdownFences = /(?:^|\n)```[\s\S]*?```/.test(content);
  const hasMarkdownHeadings = /(?:^|\n)#{1,6}\s+\S/.test(content);
  const hasMarkdownCallouts = /(?:^|\n)>\s*\[!(?:KEY INSIGHT|THINK|WARNING|NOTE|TIP)\]/i.test(content);

  if (hasHtmlTags && (hasMarkdownFences || hasMarkdownCallouts)) {
    return "mixed";
  }

  if (hasHtmlTags) {
    return "html";
  }

  if (hasMarkdownHeadings || hasMarkdownFences || hasMarkdownCallouts) {
    return "markdown";
  }

  return "html";
}
