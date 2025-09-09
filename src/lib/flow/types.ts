export type FlowFilters = {
  vibeRange?: [number, number]        // energy/valence (0..1)
  timeWindow?: { start: string; end: string }
  friendFlows?: boolean
  queue?: 'any'|'short'|'none'
  weatherPref?: string[]
  /** NEW: clustering density preference */
  clusterDensity?: 'loose' | 'normal' | 'tight'
}

export type TileVenue = {
  pid: string
  name: string
  category?: string | null
  open_now?: boolean | null
  busy_band?: 0|1|2|3|4
}

export type ConvergencePoint = {
  lng: number
  lat: number
  prob: number     // 0..1 probability
  etaMin: number   // estimated time to convergence
  groupMin: number // minimum group size
}

export type Flow = {
  id: string
  profile_id: string
  started_at: string
  ended_at?: string
  distance_m: number
  sun_exposed_min: number
  vibe_trace: Array<{t: number, energy: number, valence: number}>
  weather_trace: Array<{t: number, temp: number, precip: number, cloud: number}>
  visibility: 'owner' | 'friends' | 'public'
  start_location?: {lng: number, lat: number}
  created_at: string
  updated_at: string
}

export type FlowSegment = {
  flow_id: string
  idx: number
  arrived_at: string
  departed_at?: string
  venue_id?: string
  center: {lng: number, lat: number}
  exposure_fraction: number
  vibe_vector: {energy?: number, valence?: number}
  weather_class?: string
  h3_idx?: string
}

export type FlowRipple = {
  token: string
  flow_id: string
  created_by: string
  created_at: string
  expires_at: string
  hop_limit: number
  revoked_at?: string
  access_count: number
}