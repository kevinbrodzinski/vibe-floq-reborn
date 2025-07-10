import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Profile = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  created_at: string;
};

export const useProfile = (userId: string | undefined) => {
  const OFFLINE_MODE = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
  
  if (OFFLINE_MODE) {
    const mockProfile: Profile = {
      id: userId || 'mock-id',
      username: 'mock_user',
      display_name: 'Mock User',
      avatar_url: null,
      created_at: new Date().toISOString(),
    };

    return {
      data: userId ? mockProfile : undefined,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: !!userId,
    };
  }

  // TODO: Re-enable real profile queries
  const mockProfile: Profile = {
    id: userId || 'mock-id',
    username: 'mock_user',
    display_name: 'Mock User',
    avatar_url: null,
    created_at: new Date().toISOString(),
  };

  return {
    data: userId ? mockProfile : undefined,
    isLoading: false,
    error: null,
    isError: false,
    isSuccess: !!userId,
  };
};

export const useProfileByUsername = (username: string | undefined) => {
  const OFFLINE_MODE = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
  
  if (OFFLINE_MODE) {
    const mockProfile: Profile = {
      id: 'mock-id-' + username,
      username: username || 'mock_user',
      display_name: username || 'Mock User',
      avatar_url: null,
      created_at: new Date().toISOString(),
    };

    return {
      data: username ? mockProfile : undefined,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: !!username,
    };
  }

  // TODO: Re-enable real profile by username queries
  const mockProfile: Profile = {
    id: 'mock-id-' + username,
    username: username || 'mock_user',
    display_name: username || 'Mock User',
    avatar_url: null,
    created_at: new Date().toISOString(),
  };

  return {
    data: username ? mockProfile : undefined,
    isLoading: false,
    error: null,
    isError: false,
    isSuccess: !!username,
  };
};