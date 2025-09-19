export const vibeRingClass: Record<string, string> = {
  social: "ring-fuchsia-400/60 shadow-[0_0_18px_#f0abfc66]",
  chill: "ring-cyan-300/60 shadow-[0_0_18px_#67e8f966]",
  active: "ring-amber-300/60 shadow-[0_0_18px_#fcd34d66]",
  hype: "ring-violet-400/60 shadow-[0_0_18px_#a78bfa66]",
  productive: "ring-emerald-300/60 shadow-[0_0_18px_#6ee7b766]",
  quiet: "ring-slate-300/50 shadow-[0_0_14px_#cbd5e166]",
};

export const vibeToGradientClass: Record<string, string> = {
  social: "from-fuchsia-500 to-pink-500",
  chill: "from-cyan-400 to-blue-500",
  active: "from-amber-400 to-orange-500",
  hype: "from-violet-500 to-purple-600",
  productive: "from-emerald-400 to-green-500",
  quiet: "from-slate-400 to-gray-500",
};

export const vibeToTextClass: Record<string, string> = {
  social: "text-fuchsia-300",
  chill: "text-cyan-300",
  active: "text-amber-300",
  hype: "text-violet-300",
  productive: "text-emerald-300",
  quiet: "text-slate-300",
};

export const normalizeVibe = (v?: string) => (v ?? "social").toLowerCase();