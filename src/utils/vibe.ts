import type { Vibe } from '@/types/vibes';

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

export const vibeColor = (vibe: Vibe): string => {
  const colors = {
    chill: 'hsl(51 100% 65%)',
    social: 'hsl(24 100% 67%)', 
    hype: 'hsl(278 74% 71%)',
    flowing: 'hsl(174 84% 67%)',
    romantic: 'hsl(328 79% 70%)',
    solo: 'hsl(197 100% 50%)',
    weird: 'hsl(54 100% 67%)',
    down: 'hsl(220 9% 58%)',
    open: 'hsl(126 84% 75%)',
    curious: 'hsl(280 61% 68%)'
  };
  return colors[vibe] || colors.social;
};

export const vibeGradient = (vibe: Vibe): string => {
  return `radial-gradient(90% 90% at 50% 50%, ${vibeColor(vibe)} 0%, transparent 70%)`;
};
