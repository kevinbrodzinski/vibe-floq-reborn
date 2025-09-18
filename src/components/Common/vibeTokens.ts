export type Vibe =
  | "Social"
  | "Chill"
  | "Active"
  | "Hype"
  | "Productive"
  | "Quiet";

export function vibeToGradientClass(vibe?: Vibe | null) {
  switch (vibe) {
    case "Social": return "from-neon-social via-pulseA to-pulseB";
    case "Chill": return "from-neon-chill via-pulseC to-neon-chill";
    case "Active": return "from-neon-active via-orange-500 to-red-500";
    case "Hype": return "from-pulseB via-pulseA to-pulseB";
    case "Productive": return "from-neon-productive via-teal-500 to-cyan-500";
    case "Quiet": return "from-neon-quiet via-gray-500 to-zinc-500";
    default: return "from-pulseA via-pulseB to-pulseC";
  }
}

export function vibeToTextClass(vibe?: Vibe | null) {
  switch (vibe) {
    case "Social": return "text-vibe-social";
    case "Chill": return "text-vibe-chill";
    case "Active": return "text-vibe-active";
    case "Hype": return "text-vibe-hype";
    case "Productive": return "text-vibe-productive";
    case "Quiet": return "text-vibe-quiet";
    default: return "text-foreground";
  }
}

export function vibeToBgClass(vibe?: Vibe | null) {
  switch (vibe) {
    case "Social": return "bg-vibe-social/10";
    case "Chill": return "bg-vibe-chill/10";
    case "Active": return "bg-vibe-active/10";
    case "Hype": return "bg-vibe-hype/10";
    case "Productive": return "bg-vibe-productive/10";
    case "Quiet": return "bg-vibe-quiet/10";
    default: return "bg-muted/10";
  }
}