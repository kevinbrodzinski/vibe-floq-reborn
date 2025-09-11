import type { LatLng, Peak, SegForStory, VenueLite } from './useConvergenceStories';

export type ConvergenceStory = {
  at: number;
  energy: number;
  venue: { id: string; name: string } | null;
  dwellMin: number | null;
  categories?: string[];
  nearby: LatLng;
  headline: string;
  subline: string;
};

const toMs = (v: number | Date | string) =>
  typeof v === 'number' ? v : (v instanceof Date ? v.getTime() : Date.parse(v));

const formatTime = (t: number | Date | string) =>
  new Date(toMs(t)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const distance = (a: LatLng, b: LatLng): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;

  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return R * c;
};

export function buildConvergenceStories({
  peaks,
  segments,
  venues = [],
  maxStories = 4,
  peakWindowMin = 10
}: {
  peaks: Peak[];
  segments: SegForStory[];
  venues?: VenueLite[];
  maxStories?: number;
  peakWindowMin?: number;
}): ConvergenceStory[] {
  if (!peaks?.length || !segments?.length) return [];

  const stories: ConvergenceStory[] = [];

  // Sort peaks by energy (highest first)
  const sortedPeaks = [...peaks].sort((a, b) => b.energy - a.energy);

  for (const peak of sortedPeaks.slice(0, maxStories)) {
    const peakMs = toMs(peak.t);
    
    // Find nearest segment center for this peak time
    const nearestSegment = segments
      .map(s => ({ ...s, tMs: toMs(s.t) }))
      .sort((a, b) => Math.abs(a.tMs - peakMs) - Math.abs(b.tMs - peakMs))[0];

    if (!nearestSegment) continue;

    const center = nearestSegment.center;
    
    // Find nearest venue within reasonable distance (500m)
    const nearbyVenues = venues
      .map(v => ({ ...v, dist: distance(center, v.loc) }))
      .filter(v => v.dist <= 500)
      .sort((a, b) => a.dist - b.dist);

    const venue = nearbyVenues[0] || null;
    
    // Generate contextual headline and subline
    let headline: string;
    let subline: string;
    
    if (venue) {
      const category = venue.categories?.[0] || 'spot';
      headline = `Peak energy at ${venue.name}`;
      subline = `${formatTime(peak.t)} • ${Math.round(peak.energy * 100)}% energy • ${category}`;
    } else {
      headline = `Energy surge detected`;
      subline = `${formatTime(peak.t)} • ${Math.round(peak.energy * 100)}% energy • Location logged`;
    }

    // Estimate dwell time from nearby segments
    const dwellSegments = segments
      .map(s => ({ ...s, tMs: toMs(s.t) }))
      .filter(s => Math.abs(s.tMs - peakMs) <= peakWindowMin * 60 * 1000)
      .filter(s => distance(s.center, center) <= 100); // Within 100m

    const dwellMin = dwellSegments.length > 0 ? Math.round(dwellSegments.length * 2) : null;

    stories.push({
      at: peakMs,
      energy: peak.energy,
      venue: venue ? { id: venue.id, name: venue.name } : null,
      dwellMin,
      categories: venue?.categories,
      nearby: center,
      headline,
      subline
    });
  }

  return stories;
}