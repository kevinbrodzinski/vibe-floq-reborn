export type Vibe =
  | "social" | "chill" | "active" | "hype" | "productive" | "quiet";

export const vibeToGlow = (v: Vibe) => {
  switch (v) {
    case "social":      return "ring-sky-400 shadow-[0_0_24px_rgba(56,189,248,.45)]";
    case "chill":       return "ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,.45)]";
    case "active":      return "ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,.45)]";
    case "hype":        return "ring-fuchsia-400 shadow-[0_0_24px_rgba(232,121,249,.45)]";
    case "productive":  return "ring-cyan-400 shadow-[0_0_24px_rgba(34,211,238,.45)]";
    case "quiet":       return "ring-violet-400 shadow-[0_0_24px_rgba(167,139,250,.45)]";
    default:            return "ring-white/10";
  }
};