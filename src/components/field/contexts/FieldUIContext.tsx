import { createContext, useContext, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTimeSyncContext } from '@/components/TimeSyncProvider';
import { useDebug } from '@/lib/useDebug';
import { useFullscreenMap } from '@/store/useFullscreenMap';
import { useSelectedVenue } from '@/store/useSelectedVenue';
import { useCurrentVibe, useVibe } from '@/lib/store/useVibe';
import type { Vibe } from '@/types';

interface FieldUIContextValue {
  // Mode and navigation
  mode: string;
  isFull: boolean;
  isList: boolean;
  navigate: ReturnType<typeof useNavigate>;
  liveRef: React.RefObject<HTMLParagraphElement>;
  setMode: (mode: string) => void;
  
  // UI state
  currentVibe: Vibe;
  constellationMode: boolean;
  
  showBanner: boolean;
  detailsOpen: boolean;
  venuesSheetOpen: boolean;
  selectedVenueId: string | null;
  timeState: string;
  debug: boolean;
  
  // Actions
  setCurrentVibe: (vibe: Vibe) => void;
  setConstellationMode: (mode: boolean) => void;
  
  setShowBanner: (show: boolean) => void;
  setDetailsOpen: (open: boolean) => void;
  setVenuesSheetOpen: (open: boolean) => void;
  setSelectedVenueId: (id: string | null) => void;
}

const FieldUIContext = createContext<FieldUIContextValue | null>(null);

interface FieldUIProviderProps {
  children: React.ReactNode;
}

export const FieldUIProvider = ({ children }: FieldUIProviderProps) => {
  const [debug] = useDebug();
  const { timeState } = useTimeSyncContext();
  
  const [constellationMode, setConstellationMode] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [venuesSheetOpen, setVenuesSheetOpen] = useState(false);
  const currentVibe = useCurrentVibe() || 'social';
  const { setVibe: setCurrentVibe } = useVibe();
  const { selectedVenueId, setSelectedVenueId } = useSelectedVenue();
  
  const { mode, setMode } = useFullscreenMap();
  const liveRef = useRef<HTMLParagraphElement>(null);
  const navigate = useNavigate();

  const isFull = mode === 'full';
  const isList = mode === 'list';

  const value = {
    // Mode and navigation
    mode,
    isFull,
    isList,
    navigate,
    liveRef,
    setMode,
    
    // UI state
    currentVibe,
    constellationMode,
    
    showBanner,
    detailsOpen,
    venuesSheetOpen,
    selectedVenueId,
    timeState,
    debug,
    
    // Actions
    setCurrentVibe,
    setConstellationMode,
    
    setShowBanner,
    setDetailsOpen,
    setVenuesSheetOpen,
    setSelectedVenueId,
  };

  return (
    <FieldUIContext.Provider value={value}>
      {children}
    </FieldUIContext.Provider>
  );
};

export const useFieldUI = () => {
  const context = useContext(FieldUIContext);
  if (!context) {
    throw new Error('useFieldUI must be used within a FieldUIProvider');
  }
  return context;
};