/**
 * Canonical category → venueType → vibe mapper
 * - Normalizes Google types, FSQ categories, user/cluster labels
 * - Weights multiple signals and returns { venueType, confidence, reasons }
 * - Provides default vibe distributions per venueType
 */

import type { Vibe } from "@/lib/vibes";

/** FLOQ venue taxonomy */
export type VenueType =
  | "nightclub"
  | "bar"
  | "coffee"
  | "restaurant"
  | "gym"
  | "park"
  | "office"
  | "school"
  | "museum"
  | "theater"
  | "music_venue"
  | "stadium"
  | "hotel"
  | "store"
  | "transit"
  | "home"
  | "general";

/** Primary mapping result */
export type VenueTypeResult = {
  venueType: VenueType;
  confidence: number;        // 0..1
  reasons: string[];         // human readable matches
  matchedTokens: string[];   // raw winning tokens
};

/* ---------------------------- normalization ---------------------------- */

const stop = new Set([
  "place", "point_of_interest", "establishment", "venue", "shop", "store",
  "food", "drink", "locality", "sublocality", "neighborhood"
]);

function normToken(s: string): string {
  return s
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

function tokenize(input: string | string[] | undefined): string[] {
  const arr = Array.isArray(input) ? input : (input ? [input] : []);
  const out: string[] = [];
  for (const raw of arr) {
    const t = normToken(raw);
    if (!t) continue;
    // split on whitespace for labels like "coffee shop" → ["coffee","shop"]
    for (const piece of t.split(/\s+/)) {
      if (piece && !stop.has(piece)) out.push(piece);
    }
    // also push the joined multi-word token if length > 1 ("coffee shop")
    if (t.includes(" ")) out.push(t);
  }
  return Array.from(new Set(out)); // unique
}

/* ---------------------------- scoring tables --------------------------- */

/**
 * Keyword → venueType weights.
 * - Works for Google `types` (e.g., "night_club") and FSQ category names
 */
const KEYWORD_WEIGHTS: Record<string, Partial<Record<VenueType, number>>> = {
  // Nightlife
  "night": { nightclub: 0.8 }, "club": { nightclub: 1 }, "nightclub": { nightclub: 1 },
  "dance": { nightclub: 0.6, music_venue: 0.4 },
  "bar": { bar: 1 }, "pub": { bar: 1 }, "beer": { bar: 0.6 },
  "cocktail": { bar: 0.6 }, "brewery": { bar: 0.7 },

  // Coffee / Casual
  "coffee": { coffee: 1 }, "cafe": { coffee: 1 }, "cafeteria": { coffee: 0.7 },

  // Restaurants & food
  "restaurant": { restaurant: 1 }, "food court": { restaurant: 0.8 },
  "fast": { restaurant: 0.5 }, "takeaway": { restaurant: 0.5 },
  "diner": { restaurant: 0.8 }, "bistro": { restaurant: 0.8 },

  // Fitness & outdoors
  "gym": { gym: 1 }, "fitness": { gym: 1 }, "yoga": { gym: 0.7 },
  "park": { park: 1 }, "trail": { park: 0.8 }, "garden": { park: 0.7 },

  // Work / Office / School
  "office": { office: 1 }, "cowork": { office: 1 }, "workspace": { office: 1 },
  "school": { school: 1 }, "university": { school: 0.9 }, "college": { school: 0.9 },
  "library": { school: 0.7 },

  // Culture & events
  "museum": { museum: 1 }, "gallery": { museum: 0.7 },
  "theater": { theater: 1 }, "cinema": { theater: 0.8 }, "movie": { theater: 0.7 },
  "music": { music_venue: 0.9 }, "concert": { music_venue: 0.9 },
  "arena": { stadium: 0.9 }, "stadium": { stadium: 1 },

  // Travel
  "hotel": { hotel: 1 }, "motel": { hotel: 0.9 }, "lodging": { hotel: 0.9 },
  "airport": { transit: 1 }, "station": { transit: 0.8 }, "bus": { transit: 0.7 },
  "train": { transit: 0.8 }, "transit": { transit: 1 },

  // Retail
  "shopping": { store: 0.8 }, "mall": { store: 1 }, "market": { store: 0.8 }, "supermarket": { store: 1 },

  // Home-ish
  "home": { home: 1 }, "residential": { home: 0.7 },

  // catch-alls
  "attraction": { museum: 0.3, park: 0.3, general: 0.2 },
};

/** Stopwords that imply no strong category by themselves */
const WEAK_HINTS = new Set(["place", "establishment", "venue", "shop", "store"]);

/* ---------------------------- mapping API ------------------------------ */

/** Merge multiple token arrays with weights per source (types, categories, label) */
function scoreTokens(sources: Array<{ tokens: string[]; weight: number }>) {
  const venueScores = new Map<VenueType, number>();
  const matched: string[] = [];

  for (const src of sources) {
    for (const t of src.tokens) {
      if (WEAK_HINTS.has(t)) continue;
      const row = KEYWORD_WEIGHTS[t] || KEYWORD_WEIGHTS[t.replace(/\s+/g, "")];
      if (!row) continue;
      matched.push(t);
      Object.entries(row).forEach(([vt, w]) => {
        const prev = venueScores.get(vt as VenueType) ?? 0;
        venueScores.set(vt as VenueType, prev + w * src.weight);
      });
    }
  }

  // pick best
  let venueType: VenueType = "general";
  let best = 0;
  venueScores.forEach((v, k) => {
    if (v > best) { best = v; venueType = k; }
  });

  // normalize confidence ~ (best / (best + second))
  const sorted = [...venueScores.values()].sort((a,b)=>b-a);
  const second = sorted[1] ?? 0;
  const confidence = Math.max(0, Math.min(1, best / (best + second + 0.0001)));

  // reasons: top contributors
  const reasons: string[] = [];
  if (best > 0) reasons.push(`keywords → ${venueType} (${best.toFixed(2)})`);
  return { venueType, confidence: Number(confidence.toFixed(2)), reasons, matchedTokens: matched };
}

/**
 * Canonical mapper: categories → venueType
 */
export function mapCategoriesToVenueType(input: {
  googleTypes?: string[];        // e.g., ["night_club","bar","point_of_interest"]
  fsqCategories?: string[];      // e.g., ["Coffee Shop","Café"]
  label?: string;                // userLabel / clusterName
}): VenueTypeResult {
  const g = tokenize(input.googleTypes?.map(t => t.replace(/_/g, " ")));
  const f = tokenize(input.fsqCategories);
  const l = tokenize(input.label);

  const { venueType, confidence, reasons, matchedTokens } = scoreTokens([
    { tokens: g, weight: 1.0 },
    { tokens: f, weight: 1.0 },
    { tokens: l, weight: 0.6 }, // labels are useful but softer
  ]);

  // guard: if we found nothing meaningful, confidence 0
  const final: VenueTypeResult = {
    venueType,
    confidence: g.length + f.length + l.length === 0 ? 0 : confidence,
    reasons: reasons.length ? reasons : ["no strong category keywords"],
    matchedTokens,
  };
  return final;
}

/* ------------------- vibe/venue crosswalk helpers ---------------------- */

/** Default primary vibe for a venue type */
export function venueTypeToPrimaryVibe(vt: VenueType): Vibe {
  const map: Record<VenueType, Vibe> = {
    nightclub: "hype",
    bar: "social",
    coffee: "focused",
    restaurant: "romantic",
    gym: "energetic",
    park: "flowing",
    office: "focused",
    school: "curious",
    museum: "curious",
    theater: "romantic",
    music_venue: "excited",
    stadium: "energetic",
    hotel: "chill",
    store: "open",
    transit: "down",
    home: "solo",
    general: "chill",
  };
  return map[vt] ?? "chill";
}

/** If you only have a vibe hint, map to a plausible venue type (for GPS fallback) */
export function vibeToVenueType(v: Vibe): VenueType {
  const map: Partial<Record<Vibe, VenueType>> = {
    hype: "nightclub",
    social: "bar",
    chill: "coffee",
    focused: "office",
    flowing: "park",
    romantic: "restaurant",
    energetic: "gym",
    excited: "music_venue",
    down: "transit",
    curious: "museum",
    solo: "home",
    open: "park",
    weird: "music_venue",
  };
  return map[v] ?? "general";
}

/** Default vibe distribution per venue type (normalized) */
export function venueTypeToVibeDist(vt: VenueType): Partial<Record<Vibe, number>> {
  const dist: Record<VenueType, Partial<Record<Vibe, number>>> = {
    nightclub: { hype: 0.55, energetic: 0.25, social: 0.15 },
    bar:       { social: 0.55, hype: 0.15, chill: 0.15, romantic: 0.1 },
    coffee:    { focused: 0.5, chill: 0.25, curious: 0.15 },
    restaurant:{ romantic: 0.4, social: 0.25, chill: 0.2 },
    gym:       { energetic: 0.6, flowing: 0.2, focused: 0.15 },
    park:      { flowing: 0.4, open: 0.25, chill: 0.2 },
    office:    { focused: 0.6, solo: 0.2, chill: 0.1 },
    school:    { curious: 0.5, social: 0.2, focused: 0.2 },
    museum:    { curious: 0.45, chill: 0.2, romantic: 0.15 },
    theater:   { romantic: 0.45, chill: 0.2, social: 0.15 },
    music_venue:{ excited: 0.5, hype: 0.3, social: 0.15 },
    stadium:   { energetic: 0.55, excited: 0.25, social: 0.15 },
    hotel:     { chill: 0.45, romantic: 0.2, solo: 0.15 },
    store:     { open: 0.35, curious: 0.25, social: 0.15 },
    transit:   { down: 0.5, solo: 0.2, chill: 0.15 },
    home:      { solo: 0.55, chill: 0.25, focused: 0.1 },
    general:   { chill: 0.3, open: 0.2, social: 0.2 },
  };
  // normalize
  const base = dist[vt] ?? dist.general;
  const sum = Object.values(base).reduce((a, b) => a + (b ?? 0), 0) || 1;
  const out: Partial<Record<Vibe, number>> = {};
  Object.entries(base).forEach(([k, v]) => { out[k as Vibe] = Number(((v ?? 0)/sum).toFixed(3)); });
  return out;
}

/* ------------------------ convenience extractors ----------------------- */

/** Read from your VI object consistently */
export function extractVenueTypeFromVI(vi: any): VenueTypeResult {
  const googleTypes: string[] | undefined = vi?.placeData?.types;
  const fsqCategories: string[] | undefined = vi?.placeData?.categories?.map((c: any) => c.name);
  const label: string | undefined = vi?.userLabel || vi?.clusterName;
  
  return mapCategoriesToVenueType({ googleTypes, fsqCategories, label });
}