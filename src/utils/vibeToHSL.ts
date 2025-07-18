
import type { Vibe } from '@/types/vibes';

const palette: Record<Vibe, [number, number, number]> = {
  hype:     [340,  90, 60],  // hot pink
  chill:    [195,  70, 55],  // teal
  social:   [ 35,  85, 55],  // orange
  open:     [125,  60, 50],  // green
  solo:     [260,  40, 60],  // purple
  curious:  [ 55,  90, 60],  // yellow
  romantic: [320,  70, 60],  // pink
  weird:    [280,  70, 65],  // violet
  down:     [220,  15, 45],  // muted blue
  flowing:  [180,  60, 55],  // cyan
};

export function vibeToColor(vibe: Vibe, alpha = 0.5): number {
  const [h, s, l] = palette[vibe] ?? palette.chill;
  // Convert HSL → RGB → number (PIXI expects 0xRRGGBB)
  const rgb = hslToRgb(h / 360, s / 100, l / 100);
  return (rgb[0] << 16) + (rgb[1] << 8) + rgb[2];
}

/* little helper */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c);
  };
  return [f(0), f(8), f(4)];
}
