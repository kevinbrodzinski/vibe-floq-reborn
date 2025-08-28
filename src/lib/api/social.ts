import { supabase } from '@/integrations/supabase/client'

export const createPing = async (targetId: string) => {
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('Not authenticated');
  
  const { error } = await supabase
    .from('ping_requests')
    .insert({ 
      target_id: targetId,
      requester_id: user.data.user.id,
      status: 'pending'
    } as any)
  
  if (error) throw error
}

export const acceptPing = async (pingId: string, shareGeom?: { lat: number; lng: number }, ttl = 900) => {
  const updates: any = { 
    status: 'accepted',
    responded_at: new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('ping_requests')
    .update(updates as any)
    .eq('id', pingId as any)
    .eq('target_id', (await supabase.auth.getUser()).data.user?.id as any)
    
  if (error) throw error
  
  // If sharing location, create a shared pin
  if (shareGeom) {
    const { error: pinError } = await supabase
      .from('shared_location_pins')
      .insert({
        owner_id: (await supabase.auth.getUser()).data.user?.id!,
        viewer_id: (await supabase.from('ping_requests').select('requester_id').eq('id', pingId).single()).data?.requester_id,
        geom: `POINT(${shareGeom.lng} ${shareGeom.lat})`,
        expires_at: new Date(Date.now() + ttl * 1000).toISOString()
      })
    
    if (pinError) throw pinError
  }
}

export const declinePing = async (pingId: string) => {
  const { error } = await supabase
    .from('ping_requests')
    .update({ 
      status: 'declined',
      responded_at: new Date().toISOString()
    })
    .eq('id', pingId)
    .eq('target_id', (await supabase.auth.getUser()).data.user?.id)
    
  if (error) throw error
}