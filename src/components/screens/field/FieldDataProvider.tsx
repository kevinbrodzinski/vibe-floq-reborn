
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { safeVibe } from '@/lib/vibes';
import type { Vibe } from '@/lib/vibes';

interface FieldData {
  currentVibe: Vibe;
  vibeStrength: number;
  nearbyFloqs: any[];
  loading: boolean;
}

interface FieldDataContextType {
  fieldData: FieldData;
  updateVibe: (vibe: Vibe) => void;
  refreshData: () => void;
}

const FieldDataContext = createContext<FieldDataContextType | undefined>(undefined);

export function useFieldData() {
  const context = useContext(FieldDataContext);
  if (!context) {
    throw new Error('useFieldData must be used within a FieldDataProvider');
  }
  return context;
}

interface FieldDataProviderProps {
  children: ReactNode;
}

export function FieldDataProvider({ children }: FieldDataProviderProps) {
  const [fieldData, setFieldData] = useState<FieldData>({
    currentVibe: 'chill',
    vibeStrength: 0.5,
    nearbyFloqs: [],
    loading: true,
  });

  const updateVibe = (vibe: Vibe) => {
    // Ensure vibe is valid before updating
    const validVibe = safeVibe(vibe);
    setFieldData(prev => ({
      ...prev,
      currentVibe: validVibe,
    }));
  };

  const refreshData = () => {
    setFieldData(prev => ({ ...prev, loading: true }));
    // Simulate data refresh
    setTimeout(() => {
      setFieldData(prev => ({ ...prev, loading: false }));
    }, 1000);
  };

  useEffect(() => {
    // Initialize with default data
    refreshData();
  }, []);

  return (
    <FieldDataContext.Provider value={{
      fieldData,
      updateVibe,
      refreshData,
    }}>
      {children}
    </FieldDataContext.Provider>
  );
}
