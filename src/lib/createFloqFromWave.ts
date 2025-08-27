import { supabase } from '@/integrations/supabase/client';
import { notifyFriendStartedFloq } from './momentaryFloqNotifications';

export async function createMomentaryFromWave(args: { 
  title: string; 
  vibe: string; 
  lat: number; 
  lng: number; 
  radiusM?: number; 
  visibility?: 'public' | 'private' 
}) {
  const { title, vibe, lat, lng, radiusM, visibility } = args;
  
  try {
    const { data, error } = await supabase.rpc('rpc_floq_session_create', {
      p_vibe: vibe,
      p_title: title,
      p_lat: lat,
      p_lng: lng,
      p_radius_m: radiusM ?? 300,
      p_visibility: visibility ?? 'public',
      p_invite_profiles: [],
    });
    
    if (error) {
      console.error('Error creating floq from wave:', error);
      return { error } as const;
    }
    
    const floqId: string = typeof data === 'string' ? data : data?.id ?? data;
    
    if (!floqId) {
      return { error: 'No floq ID returned' } as const;
    }
    
    // Auto-join the creator
    const { error: joinError } = await supabase.rpc('rpc_session_join', {
      in_floq_id: floqId,
      in_status: 'here'
    });
    
    if (joinError) {
      console.warn('Created floq but failed to auto-join:', joinError);
    }

    // Get creator info and friends for notifications
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      const { data: friends } = await supabase.rpc('fn_friend_ids', {
        viewer: (await supabase.auth.getUser()).data.user?.id,
        only_close: false
      });

      if (profile && friends) {
        // Notify friends about the new momentary floq
        await notifyFriendStartedFloq({
          creatorId: (await supabase.auth.getUser()).data.user?.id || '',
          creatorName: profile.display_name || profile.username || 'Someone',
          floqId,
          floqTitle: title,
          lat,
          lng,
          friendIds: friends || []
        });
      }
    } catch (notificationError) {
      console.warn('Failed to send notifications:', notificationError);
      // Don't fail the floq creation if notifications fail
    }
    
    return { floqId } as const;
  } catch (error) {
    console.error('Exception creating floq from wave:', error);
    return { error: String(error) } as const;
  }
}