import React, { createContext, useContext, ReactNode } from 'react';
import { useFlowFilters } from '@/hooks/useFlowFilters';
import type { FlowFilters } from '@/lib/flow/types';

interface FlowFiltersContextValue {
  filters: FlowFilters;
  setFilters: (filters: FlowFilters) => void;
  loaded: boolean;
  clusterRes: number;
  loading: boolean;
  sunScore?: number;
}

const FlowFiltersContext = createContext<FlowFiltersContextValue | null>(null);

export function FlowFiltersProvider({ 
  children,
  clusterRes,
  loading,
  sunScore
}: { 
  children: ReactNode;
  clusterRes: number;
  loading: boolean;
  sunScore?: number;
}) {
  const { filters, setFilters, loaded } = useFlowFilters();
  
  return (
    <FlowFiltersContext.Provider value={{ 
      filters, 
      setFilters, 
      loaded,
      clusterRes,
      loading,
      sunScore
    }}>
      {children}
    </FlowFiltersContext.Provider>
  );
}

export function useFlowFiltersContext() {
  const context = useContext(FlowFiltersContext);
  if (!context) {
    throw new Error('useFlowFiltersContext must be used within FlowFiltersProvider');
  }
  return context;
}
