export type Vibe =
  | "Social"
  | "Chill"
  | "Active"
  | "Hype"
  | "Productive"
  | "Quiet";

export function vibeToGradientClass(vibe?: Vibe | null) {
  switch (vibe) {
    case "Social": return "from-vibe-social-start via-vibe-social-mid to-vibe-social-end";
    case "Chill": return "from-vibe-chill-start via-vibe-chill-mid to-vibe-chill-end";
    case "Active": return "from-vibe-active-start via-vibe-active-mid to-vibe-active-end";
    case "Hype": return "from-vibe-hype-start via-vibe-hype-mid to-vibe-hype-end";
    case "Productive": return "from-vibe-productive-start via-vibe-productive-mid to-vibe-productive-end";
    case "Quiet": return "from-vibe-quiet-start via-vibe-quiet-mid to-vibe-quiet-end";
    default: return "from-token-surface-1 via-token-surface-2 to-token-surface-3";
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