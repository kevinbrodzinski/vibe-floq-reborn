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

// Advanced search filters extending the basic ones
export interface AdvancedFloqFilters {
  query: string;
  radiusKm: number; // 1-100 km range
  vibes: string[]; // multiple vibe selection
  timeRange: [Date, Date]; // time window
  showOnlyActive?: boolean;
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
  
  // Advanced search
  advancedFilters: AdvancedFloqFilters;
  setAdvancedFilters: (filters: AdvancedFloqFilters | ((prev: AdvancedFloqFilters) => AdvancedFloqFilters)) => void;
  useAdvancedSearch: boolean;
  setUseAdvancedSearch: (use: boolean) => void;
  
  // UI state
  showCreateSheet: boolean;
  setShowCreateSheet: (show: boolean) => void;
  showFiltersModal: boolean;
  setShowFiltersModal: (show: boolean) => void;
  selectedFloqId: string | null;
  setSelectedFloqId: (id: string | null) => void;
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  
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
  const [showChat, setShowChat] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [sortBy, setSortBy] = useState<'distance' | 'activity' | 'recent'>('distance');
  
  // Advanced search state
  const [useAdvancedSearch, setUseAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFloqFilters>({
    query: '',
    radiusKm: 25,
    vibes: [],
    timeRange: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)], // next 7 days
    showOnlyActive: false,
  });

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
    
    // Advanced search
    advancedFilters,
    setAdvancedFilters,
    useAdvancedSearch,
    setUseAdvancedSearch,
    
    // UI state
    showCreateSheet,
    setShowCreateSheet,
    showFiltersModal,
    setShowFiltersModal,
    selectedFloqId,
    setSelectedFloqId,
    showChat,
    setShowChat,
    
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