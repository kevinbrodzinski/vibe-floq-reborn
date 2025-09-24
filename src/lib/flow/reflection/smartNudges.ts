type SmartNudge = {
  id: string;
  title: string;
  body: string;
  cta: { label: string; kind: 'reminder' | 'save' | 'open' };
  payload?: Record<string, any>;
};

type NudgeInput = {
  lat?: number;
  lng?: number;
  metrics: {
    elapsedMin: number;
    suiPct: number | null;
    distanceM: number;
  };
  vibe: {
    type?: string;
  };
};

// Simple sunset time calculation (approximation)
function calculateSunsetTime(lat?: number, lng?: number): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Rough sunset calculation (simplified)
  // In production, you'd use a proper astronomy library
  const sunsetHour = lat && lat > 40 ? 19 : 18; // Later sunset in northern latitudes
  tomorrow.setHours(sunsetHour, 30, 0, 0);
  
  return tomorrow;
}

export function computeSmartNudge(input: NudgeInput): SmartNudge | null {
  const { lat, lng, metrics, vibe } = input;
  
  // Generate different nudges based on context
  const nudges: SmartNudge[] = [];
  
  // Sunset nudge (primary recommendation)
  if (lat && lng) {
    const sunsetTime = calculateSunsetTime(lat, lng);
    const timeStr = sunsetTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    
    nudges.push({
      id: 'sunset-energizer',
      title: 'Tomorrow\'s Golden Hour',
      body: `Sunset at ${timeStr} • Perfect for an energy flow`,
      cta: { label: 'Set Reminder', kind: 'reminder' },
      payload: { time: sunsetTime.toISOString(), type: 'sunset' }
    });
  }
  
  // High energy flow -> explore nudge
  if (metrics.elapsedMin > 30 && metrics.distanceM > 2000) {
    nudges.push({
      id: 'explorer-badge',
      title: 'Explorer Achievement',
      body: `${(metrics.distanceM / 1000).toFixed(1)}km in ${Math.round(metrics.elapsedMin)}min! Save this route?`,
      cta: { label: 'Save Route', kind: 'save' },
      payload: { distance: metrics.distanceM, duration: metrics.elapsedMin }
    });
  }
  
  // Sun exposure nudge
  if (metrics.suiPct && metrics.suiPct > 70) {
    nudges.push({
      id: 'sun-champion',
      title: 'Sunshine Champion',
      body: `${metrics.suiPct}% sun exposure! Share your vitamin D success`,
      cta: { label: 'Share', kind: 'open' },
      payload: { suiPct: metrics.suiPct }
    });
  }
  
  // Vibe pattern nudge
  if (vibe.type === 'energizing' || vibe.type === 'crescendo') {
    nudges.push({
      id: 'vibe-repeat',
      title: 'Energy Pattern Detected',
      body: `Your ${vibe.type} flow boosted your energy. Repeat tomorrow?`,
      cta: { label: 'Set Reminder', kind: 'reminder' },
      payload: { vibeType: vibe.type }
    });
  }
  
  // Return the most relevant nudge
  return nudges.length > 0 ? nudges[0] : null;
}