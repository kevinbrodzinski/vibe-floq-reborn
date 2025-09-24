import { useState, useEffect } from 'react';

export type TimeState = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late';

export interface TimeSyncState {
  timeState: TimeState;
  hour: number;
  progress: number; // 0-1 within current time state
  isTransitioning: boolean;
}

const getTimeState = (hour: number): TimeState => {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  if (hour >= 21 && hour < 24) return 'night';
  return 'late'; // 0-5
};

const getStateProgress = (hour: number, timeState: TimeState): number => {
  switch (timeState) {
    case 'dawn': return (hour - 5) / 3; // 5-8
    case 'morning': return (hour - 8) / 4; // 8-12
    case 'afternoon': return (hour - 12) / 5; // 12-17
    case 'evening': return (hour - 17) / 4; // 17-21
    case 'night': return (hour - 21) / 3; // 21-24
    case 'late': return hour <= 5 ? hour / 5 : 0; // 0-5
    default: return 0;
  }
};

export const useTimeSync = (): TimeSyncState => {
  const [timeSync, setTimeSync] = useState<TimeSyncState>(() => {
    const now = new Date();
    const hour = now.getHours();
    const timeState = getTimeState(hour);
    return {
      timeState,
      hour,
      progress: getStateProgress(hour, timeState),
      isTransitioning: false
    };
  });

  useEffect(() => {
    const updateTimeSync = () => {
      const now = new Date();
      const hour = now.getHours();
      const newTimeState = getTimeState(hour);
      const progress = getStateProgress(hour, newTimeState);
      
      setTimeSync(prev => ({
        timeState: newTimeState,
        hour,
        progress,
        isTransitioning: prev.timeState !== newTimeState
      }));
    };

    // Update immediately
    updateTimeSync();
    
    // Update every minute
    const interval = setInterval(updateTimeSync, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Reset transition flag after brief delay
  useEffect(() => {
    if (timeSync.isTransitioning) {
      const timeout = setTimeout(() => {
        setTimeSync(prev => ({ ...prev, isTransitioning: false }));
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [timeSync.isTransitioning]);

  return timeSync;
};