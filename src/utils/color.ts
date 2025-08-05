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
 * Enhanced cluster color using vibe_mode for stronger vibe influence
 * `densityNorm` = cluster.member_count / maxMemberCount   (0‥1)
 * `vibeMode` = dominant vibe from database analysis
 */
export const getClusterColor = (
  densityNorm: number,
  vibeCounts: Record<string, number>,
  prefs: Record<string, number>,
  vibeMode?: string
) => {
  // Start with turbo colormap for density
  const colorString = String(turbo(densityNorm))
  const base = tinycolor(colorString).toRgb()
  
  // If we have a clear dominant vibe, use stronger influence
  if (vibeMode && vibeHueMap[vibeMode]) {
    const vibeHue = vibeHueMap[vibeMode]
    // Stronger blend for dominant vibe (35% vs 20%)
    return blendHue([base.r, base.g, base.b], vibeHue, 0.35)
  }
  
  // Fallback to weighted average from vibe counts
  const biasHue = weightedHue(vibeCounts, prefs)
  return blendHue([base.r, base.g, base.b], biasHue, 0.2)
}

/**
 * Get stroke color for cluster based on vibe_mode
 */
export const getClusterStrokeColor = (vibeMode?: string): [number, number, number] => {
  if (!vibeMode || !vibeHueMap[vibeMode]) {
    return [255, 255, 255] // white fallback
  }
  
  const hue = vibeHueMap[vibeMode]
  const vibeColor = tinycolor({ h: hue, s: 0.8, l: 0.4 }).toRgb()
  return [vibeColor.r, vibeColor.g, vibeColor.b]
}

/**
 * Get vibe-specific pulse intensity for animations
 */
export const getVibeIntensity = (vibeMode?: string): number => {
  const intensityMap: Record<string, number> = {
    hype: 1.0,      // maximum pulse
    social: 0.8,    // high energy
    flowing: 0.6,   // medium flow
    open: 0.7,      // welcoming energy
    curious: 0.5,   // gentle exploration
    romantic: 0.4,  // soft pulse
    chill: 0.3,     // minimal pulse
    solo: 0.2,      // very subtle
    down: 0.1,      // barely visible
    weird: 0.9,     // chaotic energy
  }
  
  return intensityMap[vibeMode || ''] ?? 0.5
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