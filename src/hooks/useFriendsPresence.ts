import { useEffect, useState } from 'react';
import { useFriends } from './useFriends';
import { supabase } from '@/integrations/supabase/client';
import { getEnvironmentConfig } from '@/lib/environment';

type StatusMap = Record<string, 'online' | 'away'>;

export function useFriendsPresence() {
  const env = getEnvironmentConfig();
  
  if (env.presenceMode === 'mock') {
    // Return mock status to prevent errors
    const mockStatus: StatusMap = {
      'b25fd249-5bc0-4b67-a012-f64dacbaef1a': 'online'
    };
    return mockStatus;
  }

  if (env.presenceMode === 'stub') {
    // Return stub data for testing UI without real presence calls
    const stubStatus: StatusMap = {
      'b25fd249-5bc0-4b67-a012-f64dacbaef1a': 'online',
      'stub-user-2': 'away',
      'stub-user-3': 'online'
    };
    return stubStatus;
  }

  // TODO: Implement live WebSocket subscriptions for friends presence
  // For now, return stub data even in live mode until implementation is ready
  const stubStatus: StatusMap = {
    'b25fd249-5bc0-4b67-a012-f64dacbaef1a': 'online'
  };
  
  if (env.debugPresence) {
    console.log('🔴 useFriendsPresence - Live mode not yet implemented, using stub data');
  }
  
  return stubStatus;
}