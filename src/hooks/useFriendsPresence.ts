import { useEffect, useState } from 'react';
import { useFriends } from './useFriends';
import { supabase } from '@/integrations/supabase/client';

type StatusMap = Record<string, 'online' | 'away'>;

export function useFriendsPresence() {
  const OFFLINE_MODE = import.meta.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
  
  if (OFFLINE_MODE) {
    // Return mock status to prevent errors
    const mockStatus: StatusMap = {
      'b25fd249-5bc0-4b67-a012-f64dacbaef1a': 'online'
    };
    return mockStatus;
  }

  // TODO: Re-enable WebSocket subscriptions when network is stable
  const mockStatus: StatusMap = {
    'b25fd249-5bc0-4b67-a012-f64dacbaef1a': 'online'
  };
  return mockStatus;
}