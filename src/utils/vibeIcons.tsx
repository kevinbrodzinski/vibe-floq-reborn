import { ReactNode } from 'react';

// Type for supported vibes
export type VibeType = 'chill' | 'hype' | 'curious' | 'social' | 'solo' | 'romantic' | 'weird' | 'down' | 'flowing' | 'open';

// Emoji fallbacks (current implementation)
const emojiMap: Record<VibeType, string> = {
  chill: "😌",
  hype: "🔥", 
  curious: "🤔",
  social: "👫",
  solo: "🧘",
  romantic: "💕",
  weird: "🤪",
  down: "😔",
  flowing: "🌊",
  open: "🌟",
};

// SVG icon map (ready for future SVG icons)
// When design delivers SVGs, import them like:
// import ChillSVG from '@/assets/vibes/chill.svg?react'
// and replace the emoji strings with <ChillSVG /> components
const svgIconMap: Record<VibeType, ReactNode> = {
  chill: emojiMap.chill,
  hype: emojiMap.hype,
  curious: emojiMap.curious,
  social: emojiMap.social,
  solo: emojiMap.solo,
  romantic: emojiMap.romantic,
  weird: emojiMap.weird,
  down: emojiMap.down,
  flowing: emojiMap.flowing,
  open: emojiMap.open,
};

// Main icon function - stable API that can swap between emoji and SVG
export const getVibeIcon = (vibe?: string | null): ReactNode => {
  const normalizedVibe = vibe?.toLowerCase() as VibeType;
  return svgIconMap[normalizedVibe] || "📍";
};

// Backward compatibility - keep the emoji function for any existing code
export const vibeEmoji = (vibe?: string | null): string => {
  const normalizedVibe = vibe?.toLowerCase() as VibeType;
  return emojiMap[normalizedVibe] || "📍";
};
