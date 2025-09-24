import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUserId } from '@/hooks/useCurrentUser';
import { useTimewarpDrawer } from '@/contexts/TimewarpDrawerContext';

export interface LocationPoint {
  lat: number;
  lng: number;
  captured_at: string;
  accuracy: number;
  venue_id?: string;
}

export interface TimewarpHookOptions {
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  fps?: number; // Frames per second for animation
}

export const useTimewarp = (options: TimewarpHookOptions = {}) => {
  const currentUserId = useCurrentUserId();
  const { timewarpState, setTimewarpState } = useTimewarpDrawer();
  const animationRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  
  const {
    startTime = new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    endTime = new Date(),
    limit = 1000,
    fps = 10, // 10 FPS for smooth playback
  } = options;

  // Fetch location track data
  const { data: locationTrack, isLoading, error } = useQuery({
    queryKey: ['locationTrack', currentUserId, startTime.toISOString(), endTime.toISOString()],
    queryFn: async (): Promise<LocationPoint[]> => {
      if (!currentUserId) throw new Error('No user ID');
      
      const { data, error } = await supabase.rpc('get_location_track', {
        p_profile_id: currentUserId,
        p_start_time: startTime.toISOString(),
        p_end_time: endTime.toISOString(),
        p_limit: limit,
      });
      
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update total frames when data loads
  useEffect(() => {
    if (locationTrack) {
      setTimewarpState({ 
        totalFrames: locationTrack.length,
        currentIndex: 0, // Start from beginning (most recent)
      });
    }
  }, [locationTrack, setTimewarpState]);

  // Animation loop for playback
  const animate = useCallback((timestamp: number) => {
    if (!timewarpState.isPlaying || !locationTrack?.length) return;

    const frameInterval = 1000 / (fps * timewarpState.speed);
    
    if (timestamp - lastFrameTimeRef.current >= frameInterval) {
      const nextIndex = timewarpState.currentIndex + 1;
      
      if (nextIndex >= timewarpState.totalFrames) {
        setTimewarpState({ isPlaying: false, currentIndex: timewarpState.totalFrames - 1 });
      } else {
        setTimewarpState({ currentIndex: nextIndex });
      }
      
      lastFrameTimeRef.current = timestamp;
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [timewarpState.isPlaying, timewarpState.speed, locationTrack, fps, setTimewarpState]);

  // Start/stop animation
  useEffect(() => {
    if (timewarpState.isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [timewarpState.isPlaying, animate]);

  // Control functions
  const play = useCallback(() => {
    setTimewarpState({ isPlaying: true, isActive: true });
  }, [setTimewarpState]);

  const pause = useCallback(() => {
    setTimewarpState({ isPlaying: false });
  }, [setTimewarpState]);

  const stop = useCallback(() => {
    setTimewarpState({ 
      isPlaying: false, 
      currentIndex: 0,
      isActive: false,
    });
  }, [setTimewarpState]);

  const scrubTo = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, (locationTrack?.length || 1) - 1));
    setTimewarpState({ 
      currentIndex: clampedIndex,
      isActive: true,
    });
  }, [locationTrack, setTimewarpState]);

  const setSpeed = useCallback((speed: number) => {
    setTimewarpState({ speed });
  }, [setTimewarpState]);

  // Get current location point
  const currentPoint = locationTrack?.[timewarpState.currentIndex];
  
  // Get trail points (from start to current)
  const trailPoints = locationTrack?.slice(0, timewarpState.currentIndex + 1) || [];

  return {
    // Data
    locationTrack: locationTrack || [],
    currentPoint,
    trailPoints,
    isLoading,
    error,
    
    // State
    ...timewarpState,
    
    // Controls
    play,
    pause,
    stop,
    scrubTo,
    setSpeed,
    
    // Progress
    progress: timewarpState.totalFrames > 0 
      ? timewarpState.currentIndex / (timewarpState.totalFrames - 1) 
      : 0,
  };
};