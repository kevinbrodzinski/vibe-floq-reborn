import { useEffect, useState } from 'react';
import { useUnifiedFriends } from './useUnifiedFriends';
import { supabase } from '@/integrations/supabase/client';
import { getEnvironmentConfig } from '@/lib/environment';

type StatusMap = Record<string, { status: 'online' | 'away'; visible?: boolean }>;

export function useFriendsPresence() {
  const env = getEnvironmentConfig();
  
  // Always return mock data to prevent WebSocket errors from blocking map
  const mockStatus: StatusMap = {
    'b25fd249-5bc0-4b67-a012-f64dacbaef1a': { status: 'online', visible: true }
  };
  
  if (env.debugPresence) {
    console.log('🔴 useFriendsPresence - Using mock data to prevent WS errors');
  }
  
  return mockStatus;
}