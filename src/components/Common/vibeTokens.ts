import { VIBE_RGB, type Vibe } from '@/lib/vibes';

export function vibeToGradientClass(vibe?: Vibe | null): string {
  if (!vibe) return "from-muted via-muted/80 to-muted/60";
  
  const rgb = VIBE_RGB[vibe];
  if (!rgb) return "from-muted via-muted/80 to-muted/60";
  
  // Convert RGB values to CSS custom properties that can be used with Tailwind
  const [r, g, b] = rgb;
  const baseColor = `${r} ${g} ${b}`;
  
  // Return Tailwind classes that use CSS custom properties
  return `from-[rgb(${baseColor})] via-[rgb(${baseColor}_/_0.8)] to-[rgb(${baseColor}_/_0.6)]`;
}

export function vibeToTextClass(vibe?: Vibe | null): string {
  if (!vibe) return "text-muted-foreground";
  
  const rgb = VIBE_RGB[vibe];
  if (!rgb) return "text-muted-foreground";
  
  const [r, g, b] = rgb;
  return `text-[rgb(${r}_${g}_${b})]`;
}

export function vibeToBgClass(vibe?: Vibe | null): string {
  if (!vibe) return "bg-muted/10";
  
  const rgb = VIBE_RGB[vibe];
  if (!rgb) return "bg-muted/10";
  
  const [r, g, b] = rgb;
  return `bg-[rgb(${r}_${g}_${b}_/_0.1)]`;
}

export function vibeToBorderClass(vibe?: Vibe | null): string {
  if (!vibe) return "border-muted/20";
  
  const rgb = VIBE_RGB[vibe];
  if (!rgb) return "border-muted/20";
  
  const [r, g, b] = rgb;
  return `border-[rgb(${r}_${g}_${b}_/_0.2)]`;
}