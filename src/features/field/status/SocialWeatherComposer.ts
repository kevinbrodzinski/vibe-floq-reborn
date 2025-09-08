/**
 * Social Weather Status Composer
 * Converts pressure/gradient/winds metrics into clean phrases with place labels
 */

export type WeatherType = 'storm_front' | 'high_pressure' | 'low_pressure' | 'clearing';

export type SocialWeatherMetrics = {
  meanPressure: number;     // 0..1
  stdPressure: number;      // 0..1 (variance proxy)
  meanGradient: number;     // 0..1 (avg |∇p|)
  windsStrength: number;    // 0..1 (avg flow magnitude near viewport)
  laneDensity: number;      // 0..1 (lanes/km^2 or normalized count)
  auroraActive: number;     // 0..1 (normalized #)
  placeLabel?: string;      // e.g., 'Venice', 'Arts District'
};

export type SocialWeatherPhrase = {
  emoji: string;
  headline: string;     // short status
  detail: string;       // optional subtext
  intensity: number;    // 0..1, can drive small UI accent
  type: WeatherType;    // for color theming
};

function clamp01(n: number) { 
  return Math.max(0, Math.min(1, n)); 
}

export function composeSocialWeather(m: SocialWeatherMetrics): SocialWeatherPhrase {
  const p = clamp01(m.meanPressure);
  const g = clamp01(m.meanGradient);
  const std = clamp01(m.stdPressure);
  const w = clamp01(m.windsStrength);
  const L = clamp01(m.laneDensity);
  const a = clamp01(m.auroraActive);

  // Pick base type by gradient (fronts) then pressure
  let type: WeatherType;
  if (g > 0.5) type = 'storm_front';
  else if (p > 0.7) type = 'high_pressure';
  else if (p < 0.3) type = 'low_pressure';
  else type = 'clearing';

  // Intensity is mix of variance + gradient + lanes/winds
  const intensity = clamp01(0.5 * std + 0.3 * g + 0.2 * Math.max(L, w));

  // Emojis & templates
  const EMO = { 
    storm_front: '⛈️', 
    high_pressure: '☀️', 
    low_pressure: '🌙', 
    clearing: '🌤️' 
  } as const;

  // Headlines with place label fallback (trim if undefined)
  let headline = 'Stable conditions';
  const whereSuffix = m.placeLabel ? ` in ${m.placeLabel}` : '';
  
  if (type === 'storm_front') {
    headline = L > 0.35 ? `Convergence front forming${whereSuffix}` : `Energy front detected${whereSuffix}`;
  } else if (type === 'high_pressure') {
    headline = w > 0.4 ? `Peak social energy${whereSuffix}` : `Perfect conditions building${whereSuffix}`;
  } else if (type === 'low_pressure') {
    headline = `Winding down${whereSuffix}`;
  } else {
    headline = w > 0.35 ? `Clear skies with steady flow${whereSuffix}` : `Calm conditions${whereSuffix}`;
  }

  // Detail (optional)
  let detail = '';
  if (type === 'storm_front') {
    if (a > 0) detail = a > 0.5 ? 'Auroras likely — rare energy shimmering' : 'Watch for sudden convergences';
    else detail = L > 0.35 ? 'Multiple lanes pointing to the same center' : 'Pressure gradients rising';
  } else if (type === 'high_pressure') {
    detail = w > 0.45 ? 'Currents forming — good time to join' : 'High energy pockets across venues';
  } else if (type === 'low_pressure') {
    detail = p < 0.2 ? 'Quiet zone — perfect for reset' : 'Activity tapering off';
  } else {
    detail = w > 0.35 ? 'Consistent currents across the area' : 'Ambient atmosphere';
  }

  return { 
    emoji: EMO[type], 
    headline, 
    detail, 
    intensity, 
    type 
  };
}

/**
 * Hysteresis wrapper to prevent status flicker
 */
export class SocialWeatherTracker {
  private lastPhrase: SocialWeatherPhrase | null = null;
  private lastUpdate = 0;
  private minDwellMs = 2000; // Don't change status for 2 seconds
  
  update(metrics: SocialWeatherMetrics): SocialWeatherPhrase {
    const now = performance.now();
    const newPhrase = composeSocialWeather(metrics);
    
    // First time or enough time has passed
    if (!this.lastPhrase || 
        now - this.lastUpdate > this.minDwellMs ||
        this.shouldForceUpdate(this.lastPhrase, newPhrase)) {
      this.lastPhrase = newPhrase;
      this.lastUpdate = now;
    }
    
    return this.lastPhrase;
  }
  
  private shouldForceUpdate(old: SocialWeatherPhrase, fresh: SocialWeatherPhrase): boolean {
    // Force update for major type changes or very high intensity
    return old.type !== fresh.type || fresh.intensity > 0.8;
  }
}