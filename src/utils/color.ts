import tinycolor from 'tinycolor2'
import {scaleSequential} from 'd3-scale'
import {interpolateTurbo} from 'd3-scale-chromatic'

// turbo scale  ↔ 0‥1 → rgb tuple
const turbo = scaleSequential(interpolateTurbo).domain([0, 1])

/**
 * Return weighted-average hue (0-360°) from cluster vibe counts
 * & user preference weights.
 */
export const weightedHue = (
  vibeCounts: Record<string, number>,
  prefs: Record<string, number>
) => {
  let x = 0, y = 0, wSum = 0
  Object.entries(vibeCounts).forEach(([vibe, count]) => {
    const weight = count * (1 + (prefs[vibe] ?? 0)) // bias boost
    wSum += weight
    // Map vibe → hue (you can refine this table)
    const hue = vibeHueMap[vibe] ?? 0
    const rad = (hue * Math.PI) / 180
    x += Math.cos(rad) * weight
    y += Math.sin(rad) * weight
  })
  if (!wSum) return 0
  const angle = Math.atan2(y, x)
  let hue = (angle * 180) / Math.PI
  if (hue < 0) hue += 360  // normalize to 0-360
  return hue
}

/**
 * Blend *base RGB*  →  hueTint  by `pct` (e.g. 0.2 = 20 %).
 * Returns [r,g,b] ints 0-255.
 */
export const blendHue = (
  baseRgb: [number, number, number],
  hueTint: number,
  pct = 0.2
) => {
  const src = tinycolor({r: baseRgb[0], g: baseRgb[1], b: baseRgb[2]})
  const {s, l} = src.toHsl()                // keep sat/lig

  const dst = tinycolor({h: hueTint % 360, s, l})
  const mix  = tinycolor.mix(src, dst, pct * 100).toRgb()
  return [mix.r, mix.g, mix.b] as [number, number, number]
}

/**
 * Final colour helper used by layers.
 * `densityNorm` = cluster.total / maxTotal   (0‥1)
 */
export const getClusterColor = (
  densityNorm: number,
  vibeCounts: Record<string, number>,
  prefs: Record<string, number>
) => {
  // turbo returns a string like "rgb(255, 0, 0)"
  const colorString = String(turbo(densityNorm))
  const base = tinycolor(colorString).toRgb()
  const biasHue = weightedHue(vibeCounts, prefs)
  return blendHue([base.r, base.g, base.b], biasHue, 0.2)
}

// Updated hue palette to match actual vibe enum values from database
const vibeHueMap: Record<string, number> = {
  chill: 200,       // blue
  curious: 180,     // cyan
  down: 240,        // dark blue
  flowing: 100,     // green  
  hype: 300,        // purple-ish
  open: 60,         // yellow-green
  romantic: 330,    // pink
  social: 30,       // orange
  solo: 220,        // blue-purple
  weird: 260        // purple
}