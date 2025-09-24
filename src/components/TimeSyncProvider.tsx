import { createContext, useContext, ReactNode } from 'react';
import { useTimeSync, TimeSyncState } from '@/hooks/useTimeSync';

interface TimeSyncContextType extends TimeSyncState {
  getTimeMessage: () => string;
  getTimeEmoji: () => string;
  shouldShowModule: (moduleTime: string) => boolean;
}

const TimeSyncContext = createContext<TimeSyncContextType | undefined>(undefined);

export const useTimeSyncContext = () => {
  const context = useContext(TimeSyncContext);
  if (!context) {
    throw new Error('useTimeSyncContext must be used within TimeSyncProvider');
  }
  return context;
};

interface TimeSyncProviderProps {
  children: ReactNode;
}

export const TimeSyncProvider = ({ children }: TimeSyncProviderProps) => {
  const timeSync = useTimeSync();

  const getTimeMessage = (): string => {
    switch (timeSync.timeState) {
      case 'dawn':
        return 'Soft awakening energy';
      case 'morning':
        return 'Energetic clarity';
      case 'afternoon':
        return 'Steady focus';
      case 'evening':
        return 'Social energy rising';
      case 'night':
        return 'Peak social flow';
      case 'late':
        return 'Intimate reflection';
      default:
        return 'Living in the flow';
    }
  };

  const getTimeEmoji = (): string => {
    switch (timeSync.timeState) {
      case 'dawn':
        return '🌅';
      case 'morning':
        return '☀️';
      case 'afternoon':
        return '🌤️';
      case 'evening':
        return '🌆';
      case 'night':
        return '🌃';
      case 'late':
        return '🌙';
      default:
        return '✨';
    }
  };

  const shouldShowModule = (moduleTime: string): boolean => {
    return moduleTime === timeSync.timeState;
  };

  const contextValue: TimeSyncContextType = {
    ...timeSync,
    getTimeMessage,
    getTimeEmoji,
    shouldShowModule,
  };

  return (
    <TimeSyncContext.Provider value={contextValue}>
      <div 
        className={`time-${timeSync.timeState} time-sync-transition ${
          timeSync.isTransitioning ? 'animate-pulse' : ''
        }`}
      >
        {children}
      </div>
    </TimeSyncContext.Provider>
  );
};