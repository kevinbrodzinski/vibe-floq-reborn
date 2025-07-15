import React from 'react';

/* Regex used on both client & server (keep in sync with SQL trigger) */
export const MENTION_REGEX = /(?<![A-Za-z0-9_])@([A-Za-z0-9_]{3,32})/g;

/** Returns the last "@foo" that's still being typed, else null */
export function getActiveMention(
  value: string,
  caretPos: number
): { handle: string; start: number; end: number } | null {
  const textUpToCaret = value.slice(0, caretPos);
  const match = [...textUpToCaret.matchAll(MENTION_REGEX)].pop();
  if (!match) return null;

  const [full, handle] = match;
  const start = textUpToCaret.lastIndexOf(full);
  const end = start + full.length;
  return { handle, start, end };
}

/** Replace the active mention with the chosen username */
export function insertMention(
  value: string,
  mention: { handle: string; start: number; end: number }
): string {
  return (
    value.slice(0, mention.start) +
    `@${mention.handle}` +
    value.slice(mention.end)
  );
}

/** Convert message text to React tree with clickable mentions */
export function renderMentions(
  text: string,
  linkRenderer: (handle: string) => JSX.Element
): (string | JSX.Element)[] {
  const parts = React.useMemo(() => text.split(MENTION_REGEX), [text]);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      React.createElement(React.Fragment, { key: i }, linkRenderer(part))
    ) : (
      part
    )
  );
}