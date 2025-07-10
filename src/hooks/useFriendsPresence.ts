import { useEffect, useState } from 'react';
import { useFriends } from './useFriends';
import { supabase } from '@/integrations/supabase/client';

type StatusMap = Record<string, 'online' | 'away'>;

export function useFriendsPresence() {
  // EMERGENCY STABILIZATION: Disabled WebSocket subscriptions
  // TODO: Re-enable after fixing cascade issues
  
  // Return mock status to prevent errors
  const mockStatus: StatusMap = {
    'b25fd249-5bc0-4b67-a012-f64dacbaef1a': 'online'
  };

  return mockStatus;
}