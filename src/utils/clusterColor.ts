import memoizeOne from 'memoize-one'
import tinycolor from 'tinycolor2'
import { blendHue, dominantColor } from './vibe'
import { interpolateTurbo } from 'd3-scale-chromatic'

// resolution-6 cluster => ~1 km²; tweak as desired
const MIN_PX = 6
const MAX_PX = 42

export type Cluster = {
  gh6: string;
  centroid: { type: 'Point'; coordinates: [number, number] };
  total: number;
  member_count: number;
  vibe_counts: Record<string, number>;
  vibe_mode: string;
}

// Turbo palette for density mapping (0-200 people)
const createTurboPalette = () => {
  const palette: [number, number, number][] = []
  for (let i = 0; i <= 200; i++) {
    const t = i / 200
    const colorStr = interpolateTurbo(t)
    const color = tinycolor(colorStr).toRgb()
    palette.push([color.r, color.g, color.b])
  }
  return palette
}

const turboPalette = createTurboPalette()

/* ------------------------------------------------------------------------- *\
|*  Size helpers                                                              *|
\* ------------------------------------------------------------------------- */

const SCALE = (count: number) =>
  Math.min(MAX_PX, Math.max(MIN_PX, Math.sqrt(count) * 6))

export const clusterSizePx = memoizeOne(SCALE)

/* ------------------------------------------------------------------------- *\
|*  Color helpers                                                             *|
\* ------------------------------------------------------------------------- */

// Base turbo colour by density (0-200 people → turbo[0]-turbo[200])
const baseTurbo = (count: number): [number, number, number] => {
  const idx = Math.min(turboPalette.length - 1, Math.floor(count))
  return turboPalette[idx]
}

export const clusterFill = memoizeOne(
  ({ member_count, vibe_mode }: Cluster): [number, number, number] => {
    // 1. density hue
    const turboRGB = baseTurbo(member_count)
    // 2. shift toward dominant vibe
    return blendHue(turboRGB, vibe_mode as any, 0.45)
  }
)

export const clusterStroke = memoizeOne(
  ({ vibe_mode }: Cluster, alpha = 0.8) => {
    const colorStr = dominantColor(vibe_mode as any, alpha)
    const color = tinycolor(colorStr).brighten(0.4).toRgb()
    return [color.r, color.g, color.b] as [number, number, number]
  }
)