import { createContext, useContext, useState, useMemo } from 'react';
import type { Vibe } from '@/types';

export type FloqTab = 'home' | 'nearby' | 'my' | 'dms';

export interface FloqFilters {
  vibe?: Vibe;
  distanceKm?: number;
  tagIds?: string[];
  isActive?: boolean;
  searchQuery?: string;
}

interface FloqUIContextValue {
  // Tab navigation
  activeTab: FloqTab;
  setActiveTab: (tab: FloqTab) => void;
  
  // Filters and search
  filters: FloqFilters;
  setFilters: (filters: FloqFilters | ((prev: FloqFilters) => FloqFilters)) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // UI state
  showCreateSheet: boolean;
  setShowCreateSheet: (show: boolean) => void;
  showFiltersModal: boolean;
  setShowFiltersModal: (show: boolean) => void;
  selectedFloqId: string | null;
  setSelectedFloqId: (id: string | null) => void;
  
  // View preferences
  viewMode: 'cards' | 'list';
  setViewMode: (mode: 'cards' | 'list') => void;
  sortBy: 'distance' | 'activity' | 'recent';
  setSortBy: (sort: 'distance' | 'activity' | 'recent') => void;
  
  // Helper actions
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const FloqUIContext = createContext<FloqUIContextValue | null>(null);

interface FloqUIProviderProps {
  children: React.ReactNode;
}

export const FloqUIProvider = ({ children }: FloqUIProviderProps) => {
  const [activeTab, setActiveTab] = useState<FloqTab>('home');
  const [filters, setFilters] = useState<FloqFilters>({} as FloqFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [selectedFloqId, setSelectedFloqId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [sortBy, setSortBy] = useState<'distance' | 'activity' | 'recent'>('distance');

  const clearFilters = () => {
    setFilters({} as FloqFilters);
    setSearchQuery('');
  };

  const hasActiveFilters = useMemo(() => Boolean(
    filters.vibe || 
    filters.distanceKm !== undefined || 
    filters.tagIds?.length || 
    filters.isActive !== undefined ||
    searchQuery.trim()
  ), [filters, searchQuery]);

  const value: FloqUIContextValue = {
    // Tab navigation
    activeTab,
    setActiveTab,
    
    // Filters and search
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    
    // UI state
    showCreateSheet,
    setShowCreateSheet,
    showFiltersModal,
    setShowFiltersModal,
    selectedFloqId,
    setSelectedFloqId,
    
    // View preferences
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    
    // Helper actions
    clearFilters,
    hasActiveFilters,
  };

  return (
    <FloqUIContext.Provider value={value}>
      {children}
    </FloqUIContext.Provider>
  );
};

export const useFloqUI = () => {
  const context = useContext(FloqUIContext);
  if (!context) {
    throw new Error('useFloqUI must be used within a FloqUIProvider');
  }
  return context;
};