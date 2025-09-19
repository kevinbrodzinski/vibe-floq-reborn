export type Vibe = "social" | "chill" | "active" | "hype" | "productive" | "quiet";

export function vibeToGradient(v?: Vibe | string | null) {
  switch ((v ?? "social").toString().toLowerCase()) {
    case "chill":       return "from-cyan-300 via-sky-400 to-cyan-300";
    case "hype":        return "from-fuchsia-400 via-violet-400 to-fuchsia-400";
    case "active":      return "from-orange-400 via-rose-500 to-pink-500";
    case "productive":  return "from-emerald-400 via-teal-500 to-cyan-500";
    case "quiet":       return "from-slate-400 via-gray-500 to-zinc-500";
    default:            return "from-indigo-400 via-fuchsia-400 to-cyan-400";
  }
}

export function energyToWidth(n?: number) {
  const clamped = Math.max(0, Math.min(1, n ?? 0));
  return `${Math.round(clamped * 100)}%`;
}