import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useCreateMomentaryFromWave() {
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const createFromWave = async (params: {
    waveId: string;
    lat: number;
    lng: number;
    title?: string;
    vibe?: string;
  }) => {
    if (isCreating) return null;
    
    setIsCreating(true);
    try {
      console.log('Creating momentary floq from wave:', params.waveId);
      
      // Create momentary floq at the wave location
      const { data: floqId, error } = await supabase.rpc('rpc_floq_session_create', {
        p_vibe: (params.vibe as any) || 'hype',
        p_title: params.title || 'Spontaneous Floq',
        p_lat: params.lat,
        p_lng: params.lng,
        p_radius_m: 300, // Smaller radius for momentary floqs
        p_visibility: 'public',
        p_invite_profiles: [] // No specific invites, let people discover
      });

      if (error) {
        console.error('Error creating floq from wave:', error);
        toast({
          title: "Couldn't create Floq",
          description: "Please try again in a moment.",
          variant: "destructive",
        });
        return null;
      }

      // Auto-join the creator
      const { error: joinError } = await supabase.rpc('rpc_session_join', {
        in_floq_id: floqId,
        in_status: 'here'
      });

      if (joinError) {
        console.warn('Created floq but failed to auto-join:', joinError);
      }

      toast({
        title: "Floq created!",
        description: "You've started a momentary floq from this wave.",
      });

      // Navigate to the new floq
      navigate(`/floqs/${floqId}`);
      return floqId;
      
    } catch (error) {
      console.error('Failed to create floq from wave:', error);
      toast({
        title: "Error",
        description: "Failed to create floq. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createFromWave,
    isCreating
  };
}