// Single source of truth for vibe types
export type VibeEnum = "hype" | "social" | "romantic" | "weird" | "open" | "flowing" | "down" | "solo" | "chill";

export const VIBE_OPTIONS: VibeEnum[] = [
  "hype", "social", "romantic", "weird", "open", "flowing", "down", "solo", "chill"
];

// Wheel order for smooth color transitions (arranged by color harmony)
export const VIBE_ORDER: VibeEnum[] = [
  "hype",      // Red-orange energy
  "romantic",  // Pink warmth  
  "social",    // Yellow joy
  "open",      // Green growth
  "flowing",   // Cyan flow
  "chill",     // Blue calm
  "solo",      // Indigo introspection
  "down",      // Purple depth
  "weird"      // Magenta mystery
];

// Vibe colors using design system tokens
export const VIBE_COLORS: Record<VibeEnum, string> = {
  hype: "#ff6b35",      // vibrant orange-red
  romantic: "#ff8fab",  // soft pink
  social: "#ffd23f",    // bright yellow
  open: "#06d6a0",      // fresh green
  flowing: "#118ab2",   // flowing blue
  chill: "#073b4c",     // deep calm blue
  solo: "#6a4c93",      // introspective purple
  down: "#8d5a97",      // muted purple
  weird: "#d90368"      // electric magenta
};