import {
  ContextFactWithId, ContextSnapshot, isTemporal, isTransition, isVenue,
  isVibe, isDevice, isWeather, Confidence01, ContextSummary, VibeTransition,
  VenuePattern, CorrectionTrend, ContextualInsight, VenueFact, VibeFact
} from './types';

/** Aggregate context safely from fact list (type-safe reducers) */
export function synthesizeContext(facts: ContextFactWithId[]): ContextSnapshot {
  if (!Array.isArray(facts) || facts.length === 0) {
    return { t0: 0, t1: 0, transitions: [], confidence: 0 };
  }

  const sorted = [...facts].sort((a,b) => a.t - b.t);
  const t0 = sorted[0].t ?? 0;
  const t1 = sorted[sorted.length - 1].t ?? t0;

  // latest pointers
  let temporal: ContextSnapshot['latest']['temporal'];
  let venue:    ContextSnapshot['latest']['venue'];
  let vibe:     ContextSnapshot['latest']['vibe'];
  let device:   ContextSnapshot['latest']['device'];
  let weather:  ContextSnapshot['latest']['weather'];

  // transitions aggregation
  const transMap = new Map<string, { n: number; totalLatency: number; samples: number }>();

  // confidence accumulator
  let confSum = 0;
  let confN   = 0;

  for (const f of sorted) {
    const c: Confidence01 = (typeof f.c === 'number' && f.c >= 0 && f.c <= 1) ? f.c : 0.5;
    confSum += c; confN++;

    // Exhaustive "if guard → use" blocks; no unsafe access to union
    if (isTemporal(f)) {
      temporal = { ...f.data };
      continue;
    }
    if (isVenue(f)) {
      venue = { ...f.data };
      continue;
    }
    if (isVibe(f)) {
      vibe = { ...f.data };
      continue;
    }
    if (isDevice(f)) {
      device = { ...f.data };
      continue;
    }
    if (isWeather(f)) {
      weather = { ...f.data };
      continue;
    }
    if (isTransition(f)) {
      const key = `${f.data.from}→${f.data.to}`;
      const prev = transMap.get(key) ?? { n: 0, totalLatency: 0, samples: 0 };
      prev.n += 1;
      if (typeof f.data.latencyMs === 'number') {
        prev.totalLatency += f.data.latencyMs;
        prev.samples += 1;
      }
      transMap.set(key, prev);
      continue;
    }
    // NoteFact or any future kind is intentionally ignored in synthesis
  }

  const transitions = [...transMap.entries()].map(([key, v]) => {
    const m = key.split('→');
    const avgLatencyMs = v.samples ? Math.round(v.totalLatency / v.samples) : undefined;
    return { from: m[0], to: m[1], n: v.n, avgLatencyMs };
  }).sort((a,b) => b.n - a.n);

  const confidence = confN ? Math.max(0, Math.min(1, confSum / confN)) : 0;

  return {
    t0, t1,
    latest: { temporal, venue, vibe, device, weather },
    transitions,
    confidence,
  };
}

/**
 * Legacy compatibility - converts new ContextSnapshot to old ContextSummary format
 */
export function synthesizeContextSummary(facts: ContextFactWithId[]): ContextSummary {
  const snapshot = synthesizeContext(facts);
  
  // Extract vibe transitions from facts
  const vibeTransitions: VibeTransition[] = [];
  const vibeFacts = facts.filter(isVibe).sort((a, b) => a.t - b.t);
  
  for (let i = 1; i < vibeFacts.length; i++) {
    const prev = vibeFacts[i - 1] as ContextFactWithId & VibeFact;
    const curr = vibeFacts[i] as ContextFactWithId & VibeFact;
    
    vibeTransitions.push({
      from: prev.data.vibe,
      to: curr.data.vibe,
      duration: curr.t - prev.t,
      confidence: (prev.data.confidence + curr.data.confidence) / 2,
      trigger: 'detected_change'
    });
  }

  // Extract venue patterns
  const venueSequence: VenuePattern[] = [];
  const venueFacts = facts.filter(isVenue);
  const venueMap = new Map<string, (ContextFactWithId & VenueFact)[]>();
  
  venueFacts.forEach(fact => {
    const venueFact = fact as ContextFactWithId & VenueFact;
    if (!venueMap.has(venueFact.data.type)) {
      venueMap.set(venueFact.data.type, []);
    }
    venueMap.get(venueFact.data.type)!.push(venueFact);
  });
  
  venueMap.forEach((visits, venueType) => {
    venueSequence.push({
      venueType,
      visitCount: visits.length,
      averageEnergy: visits.reduce((sum, v) => sum + (v.data.rating || 3), 0) / visits.length / 5,
      energyImpact: 0.5,
      optimalDuration: 30 * 60 * 1000
    });
  });

  // Generate correction trends
  const correctionTrends: CorrectionTrend[] = [{
    pattern: 'Context learning',
    frequency: facts.length / Math.max(100, facts.length),
    accuracy: Math.min(0.9, snapshot.confidence),
    improvement: 0.1
  }];

  // Generate contextual insights
  const contextualInsights: ContextualInsight[] = [];
  
  if (facts.length > 5) {
    contextualInsights.push({
      id: 'context-active',
      text: 'Context AI is learning from your patterns',
      confidence: snapshot.confidence,
      category: 'behavioral',
      contextual: true
    });
  }

  if (vibeTransitions.length > 3) {
    contextualInsights.push({
      id: 'vibe-patterns',
      text: `Detected ${vibeTransitions.length} vibe transitions`,
      confidence: 0.8,
      category: 'temporal',
      contextual: true
    });
  }

  if (venueSequence.length > 2) {
    contextualInsights.push({
      id: 'venue-patterns',
      text: `Active in ${venueSequence.length} venue types`,
      confidence: 0.7,
      category: 'venue',
      contextual: true
    });
  }

  return {
    vibeTransitions: vibeTransitions.slice(-5),
    venueSequence: venueSequence.slice(-10),
    correctionTrends,
    contextualInsights,
    factCount: facts.length,
    confidence: snapshot.confidence,
    summary: facts.length > 0 
      ? `Tracking ${facts.length} context facts with ${Math.round(snapshot.confidence * 100)}% confidence`
      : 'Building context awareness...'
  };
}