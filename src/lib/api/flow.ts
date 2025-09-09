import { supabase } from '@/integrations/supabase/client'
import type { FlowFilters, TileVenue, ConvergencePoint } from '@/lib/flow/types'

export async function fetchFlowVenues(args: {
  bbox?: [number, number, number, number]
  center?: [number, number]
  radius?: number
  filters?: FlowFilters
}): Promise<{ venues: TileVenue[] }> {
  try {
    const { data, error } = await supabase.functions.invoke<{ venues: TileVenue[] }>('search-flow-venues', { 
      body: args 
    })
    
    if (error) throw error
    return { venues: data?.venues ?? [] }
  } catch (error) {
    console.error('Failed to fetch flow venues:', error)
    return { venues: [] }
  }
}

export async function fetchConvergence(args: {
  bbox?: [number, number, number, number]
  center?: [number, number]
  zoom?: number
  /** NEW: override H3 resolution computed from zoom */
  res?: number
}): Promise<{ points: ConvergencePoint[] }> {
  try {
    const { data, error } = await supabase.functions.invoke<{ points: ConvergencePoint[] }>('detect-convergence', { 
      body: args 
    })
    
    if (error) throw error
    return { points: data?.points ?? [] }
  } catch (error) {
    console.error('Failed to fetch convergence data:', error)
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