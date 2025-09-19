export type VibeId = "social" | "chill" | "active" | "hype" | "productive" | "quiet";

export function neonClassForVibe(id: VibeId): string {
  switch (id) {
    case "social":     return "neon-social";
    case "chill":      return "neon-chill";
    case "active":     return "neon-active";
    case "hype":       return "neon-hype";
    case "productive": return "neon-productive";
    case "quiet":      return "neon-quiet";
    default:           return "neon-cyan";
  }
}