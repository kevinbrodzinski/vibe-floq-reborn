// keep this tiny file tree-shakable
export const vibeEmoji = (() => {
  const map: Record<string, string> = {
    chill:     "😌",
    hype:      "🔥",
    curious:   "🤔",
    social:    "👫",
    solo:      "🧘",
    romantic:  "💕",
    weird:     "🤪",
    down:      "😔",
    flowing:   "🌊",
    open:      "🌟",
  };
  return (vibe?: string | null): string => map[vibe?.toLowerCase() ?? ""] ?? "📍";
})();
