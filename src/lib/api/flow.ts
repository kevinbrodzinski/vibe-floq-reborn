import { supabase } from '@/integrations/supabase/client'
import type { FlowFilters, TileVenue, ConvergencePoint } from '@/lib/flow/types'

/**
 * Fetch flow-aware venues via single enriched RPC.
 * Server handles: bbox + flow activity + friend boost + "sun" boost + stable sort.
 */
export async function fetchFlowVenues(args: {
  bbox?: [number, number, number, number]
  center?: [number, number]
  radius?: number
  filters?: FlowFilters
}): Promise<{ venues: TileVenue[] }> {
  try {
    // Basic guards so we don't ship junk to edge
    const hasBbox = Array.isArray(args.bbox) && args.bbox.length === 4
    const hasCenter = Array.isArray(args.center) && args.center.length === 2
    if (!hasBbox && !hasCenter) return { venues: [] }

    const wantsSun =
      Array.isArray(args.filters?.weatherPref) &&
      args.filters!.weatherPref!.includes('sun')
    const includeFriend = !!args.filters?.friendFlows

    // Clamp radius 50..5000 (server also clamps)
    const radius = Math.max(50, Math.min(5000, Number(args.radius ?? 1000)))

    const { data, error } = await supabase.rpc('search_flow_venues_enriched', {
      bbox_geojson: hasBbox
        ? {
            type: 'Polygon',
            coordinates: [
              [
                [args.bbox![0], args.bbox![1]],
                [args.bbox![2], args.bbox![1]],
                [args.bbox![2], args.bbox![3]],
                [args.bbox![0], args.bbox![3]],
                [args.bbox![0], args.bbox![1]],
              ],
            ],
          }
        : null,
      center_lat: hasCenter ? args.center![1] : null,
      center_lng: hasCenter ? args.center![0] : null,
      radius_m: radius,
      since_minutes: 45,
      include_friend_boost: includeFriend,
      wants_sun: wantsSun,
      limit_n: 200,
    })

    if (error) throw error

    const venues: TileVenue[] = (data ?? []).map((v: any) => {
      const bb = Number(v.busy_band)
      const busy_band = (bb >= 0 && bb <= 4 ? bb : 0) as 0 | 1 | 2 | 3 | 4
      return {
        pid: String(v.id),
        name: String(v.name ?? ''),
        category: v.category ?? null, // first category (text) from server view
        busy_band,
      }
    })

    return { venues }
  } catch (e) {
    console.error('[fetchFlowVenues]', e)
    return { venues: [] }
  }
}

/**
 * Convergence points (unchanged interface). Supports H3 res override.
 * Your edge function already accepts `res` and uses the SQL RPC.
 */
export async function fetchConvergence(args: {
  bbox?: [number, number, number, number]
  center?: [number, number]
  zoom?: number
  res?: number // override H3 resolution (clamped server-side)
}): Promise<{ points: ConvergencePoint[] }> {
  try {
    const { data, error } = await supabase.functions.invoke<{
      points: ConvergencePoint[]
    }>('detect-convergence', { body: args })

    if (error) throw error
    return { points: data?.points ?? [] }
  } catch (e) {
    console.error('[fetchConvergence]', e)
    return { points: [] }
  }
}

// Flow CRUD operations for future sprints
export async function startFlow(): Promise<{ flowId: string }> {
  const { data, error } = await supabase.functions.invoke<{ flowId: string }>('flow-start', {})
  if (error) throw error
  return data!
}

export async function appendFlowSegment(args: {
  flowId: string
  segment: any
}): Promise<{ ok: boolean }> {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean }>('flow-append', { 
    body: args 
  })
  if (error) throw error
  return data!
}

export async function endFlow(flowId: string, opts?: { sun_exposed_min?: number }): Promise<{ summary: any }> {
  const { data, error } = await supabase.functions.invoke<{ summary: any }>('flow-end', { 
    body: { flowId, sun_exposed_min: opts?.sun_exposed_min } 
  })
  if (error) throw error
  return data!
}