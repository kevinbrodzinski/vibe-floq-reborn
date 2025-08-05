import React, { useRef, useCallback, useEffect, useState } from 'react';
import { RefreshCcw, Filter, Search, Settings, Map, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { FloqStatusBadge } from '@/components/FloqStatusBadge';
import { StoriesBar } from '@/components/StoriesBar';
import { RecommendationsStrip } from '@/components/RecommendationsStrip';
import { FilterModal } from '@/components/FilterModal';
import { EnhancedFilterModal } from '@/components/EnhancedFilterModal';
import { SearchBarWithTypeahead } from '@/components/SearchBarWithTypeahead';
import { AdvancedSearchSheet } from '@/components/AdvancedSearchSheet';
import { CreateFloqSheet } from '@/components/CreateFloqSheet';
import { FloqCard } from '@/components/floq/FloqCard';
import { MyFlockCard } from '@/components/flocks/MyFlockCard';
import { useMyFlocks } from '@/hooks/useMyFlocks';
import { useNearbyFlocks } from '@/hooks/useNearbyFlocks';
import { useFloqSuggestions } from '@/hooks/useFloqSuggestions';
import { useFloqSearch } from '@/hooks/useFloqSearch';
import { useGeo } from '@/hooks/useGeo';
import { useFloqUI } from '@/contexts/FloqUIContext';
import { formatDistance } from '@/utils/formatDistance';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDrag } from '@use-gesture/react';
import { zIndex } from '@/constants/z';
interface FlocksHomeProps {
  geo?: {
    lat: number;
    lng: number;
  };
  onRefresh?: () => void;
  isRefreshing?: boolean;
}
export const FlocksHome: React.FC<FlocksHomeProps> = ({
  geo: propGeo,
  onRefresh,
  isRefreshing = false
}) => {
  const {
    searchQuery,
    setSearchQuery,
    filters,
    showFiltersModal,
    setShowFiltersModal,
    showCreateSheet,
    setShowCreateSheet,
    hasActiveFilters,
    selectedFloqId,
    setSelectedFloqId,
    advancedFilters,
    useAdvancedSearch,
    setUseAdvancedSearch
  } = useFloqUI();
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const refreshRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Use enhanced geolocation hook with better permission handling
  const {
    coords,
    hasPermission,
    error: geoError,
    requestLocation
  } = useGeo();
  const geo = propGeo || coords;

  // Pull-to-refresh gesture handling
  const bind = useDrag(({
    last,
    movement: [, my],
    cancel,
    canceled
  }) => {
    if (my < -70 && !canceled) {
      cancel();
      handleRefresh();
    }
  }, {
    axis: 'y',
    filterTaps: true,
    pointer: {
      touch: true
    }
  });

  // Data hooks with search query filter
  const {
    data: myFlocks = [],
    isLoading: myFlocksLoading,
    error: myFlocksError
  } = useMyFlocks();

  // Advanced search hook
  const {
    data: advancedSearchResults = [],
    isLoading: advancedSearchLoading
  } = useFloqSearch(geo, {
    query: advancedFilters.query,
    radiusKm: advancedFilters.radiusKm,
    vibes: advancedFilters.vibes,
    timeRange: advancedFilters.timeRange
  }, useAdvancedSearch && geo !== null);
  
  const {
    data: nearbyFlocks = [],
    isLoading: nearbyLoading,
    error: nearbyError
  } = useNearbyFlocks({
    geo,
    filters: {
      ...filters,
      searchQuery
    }, // Include search query in filters
    enabled: !!geo && !useAdvancedSearch
  });

  // Error logging for data hooks
  useEffect(() => {
    if (myFlocksError) console.error('[MyFlocks] query failed', myFlocksError);
    if (nearbyError) console.error('[NearbyFlocks] query failed', nearbyError);
  }, [myFlocksError, nearbyError]);
  const {
    data: suggestions = [],
    isLoading: suggestionsLoading
  } = useFloqSuggestions({
    geo
  });

  // Use advanced search results when advanced search is active
  const displayFlocks = useAdvancedSearch ? advancedSearchResults : nearbyFlocks;
  const isSearching = useAdvancedSearch ? advancedSearchLoading : nearbyLoading;

  // Memoized handlers for FloqCard actions
  const handleBoost = useCallback((floqId: string) => {
    // Boost functionality handled by BoostButton component
    console.log('Boosting floq:', floqId);
  }, []);
  const handleLeave = useCallback((floqId: string) => {
    // Leave functionality handled by floq management components
    console.log('Leaving floq:', floqId);
  }, []);
  const handleFloqPress = (floqId: string) => {
    setSelectedFloqId(floqId);
    navigate(`/floqs/${floqId}`);
  };
  const handleCreatePress = () => {
    setShowCreateSheet(true);
  };
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger search by invalidating queries
    queryClient.invalidateQueries({
      queryKey: ["nearby-flocks"]
    });
  };
  const handleRefresh = () => {
    queryClient.invalidateQueries();
    onRefresh?.();
  };
  return <div className="flex flex-col h-full bg-background touch-none" ref={refreshRef} {...bind()}>
      {/* Geolocation Permission Banner */}
      {hasPermission === false && <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-yellow-600 dark:text-yellow-400">
              📍 Location access needed to see nearby flocks
            </span>
            <Button size="sm" variant="outline" onClick={requestLocation} className="text-xs h-6">
              Enable
            </Button>
          </div>
        </div>}
      {/* Header with search and filters */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border/40 px-4 py-3" {...zIndex('uiHeader')}>
        <div className="flex items-center gap-3">
          {useAdvancedSearch ? <form onSubmit={handleSearchSubmit} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Using advanced search..." value={advancedFilters.query} onChange={() => {}} // Disabled for advanced search
            className="pl-10 bg-background/50" disabled />
              </div>
            </form> : <SearchBarWithTypeahead value={searchQuery} onChange={setSearchQuery} onSelect={result => {
          // Navigate to selected floq
          navigate(`/floqs/${result.id}`);
        }} placeholder="Search floqs..." className="flex-1" />}
          
          {/* Advanced Search Toggle */}
          <Button variant={useAdvancedSearch ? "default" : "outline"} size="sm" onClick={() => {
          if (useAdvancedSearch) {
            setUseAdvancedSearch(false);
          } else {
            setShowAdvancedSearch(true);
          }
        }} className={cn("relative", useAdvancedSearch && "border-primary bg-primary text-primary-foreground")}>
            <Settings className="w-4 h-4" />
            {useAdvancedSearch && <Badge variant="secondary" className="absolute -top-2 -right-2 h-4 w-4 p-0 text-[10px]">
                A
              </Badge>}
          </Button>
          
          
          
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing} className={cn(isRefreshing && "animate-spin")}>
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Advanced Search Status Bar */}
        {useAdvancedSearch && <div className="mt-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Advanced Search Active</span>
              {advancedFilters.query && <Badge variant="outline" className="text-xs">
                  "{advancedFilters.query}"
                </Badge>}
              {advancedFilters.vibes.length > 0 && <Badge variant="outline" className="text-xs">
                  {advancedFilters.vibes.length} vibe{advancedFilters.vibes.length !== 1 ? 's' : ''}
                </Badge>}
              <Badge variant="outline" className="text-xs">
                {advancedFilters.radiusKm} km radius
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setAdvancedSearchOpen(true)} className="text-xs h-6">
              Edit
            </Button>
          </div>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-4">
          {/* My Flocks Cards */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">My Floqs</h2>
              <Badge variant="secondary" className="text-xs">
                {myFlocks?.length || 0}
              </Badge>
            </div>
            {myFlocksLoading ? <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                {[...Array(3)].map((_, i) => <Card key={i}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="h-[104px] w-[104px] rounded-2xl bg-muted/40 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-muted/40 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-muted/40 rounded animate-pulse" />
                        <div className="h-3 w-2/3 bg-muted/40 rounded animate-pulse" />
                      </div>
                    </CardContent>
                  </Card>)}
              </div> : myFlocks.length > 0 ? <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                {myFlocks.map(flock => <MyFlockCard key={flock.id} flock={flock} onOpen={() => handleFloqPress(flock.id)} />)}
              </div> : <Card onClick={handleCreatePress} className="cursor-pointer border-dashed border-2 hover:bg-accent/50 transition-colors">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-primary/10 p-4 mb-4">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Create Your First Flock</h3>
                  <p className="text-sm text-muted-foreground">
                    Start building your community by creating a flock
                  </p>
                </CardContent>
              </Card>}
          </section>

          {/* AI Recommendations */}
          {suggestions.length > 0 && <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Recommended for You
                </h2>
                <Badge variant="outline" className="text-xs">
                  AI ✨
                </Badge>
              </div>
              <RecommendationsStrip geo={geo} onSelectFloq={floq => handleFloqPress(floq.floq_id)} />
            </section>}

          {/* Floqs Results */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">
                {useAdvancedSearch ? 'Search Results' : 'Nearby Floqs'}
              </h2>
              <Badge variant="secondary" className="text-xs">
                {displayFlocks.length}
              </Badge>
            </div>
            
            {isSearching ? <div className="space-y-4">
                {[...Array(3)].map((_, i) => <div key={i} className="flex items-center gap-4 p-5 bg-card/30 border border-border/20 backdrop-blur-md rounded-xl">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-3">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>)}
              </div> : displayFlocks.length > 0 ? <ul role="list" aria-label={useAdvancedSearch ? "Search results" : "Nearby floqs"} className="space-y-4">
                {displayFlocks.slice(0, 20).map(floq => <li key={floq.id}>
                    <FloqCard floq={floq} onBoost={floq.is_joined ? handleBoost : undefined} onLeave={floq.is_joined ? handleLeave : undefined} hasUserBoosted={floq.hasUserBoosted} />
                  </li>)}
              </ul> : <div className="text-center py-8 text-muted-foreground">
                <p>{useAdvancedSearch ? 'No floqs match your search' : 'No nearby floqs found'}</p>
                <p className="text-sm mt-1">
                  {useAdvancedSearch ? 'Try adjusting your search criteria' : 'Try adjusting your filters or create one!'}
                </p>
              </div>}
          </section>
        </div>
      </div>

      {/* Modals */}
      <EnhancedFilterModal open={advancedSearchOpen} onOpenChange={setAdvancedSearchOpen} />
      <AdvancedSearchSheet open={showAdvancedSearch} onOpenChange={open => {
      setShowAdvancedSearch(open);
      if (!open && !useAdvancedSearch) {
        // If closing without enabling, ensure advanced search is off
        setUseAdvancedSearch(false);
      } else if (!open && useAdvancedSearch) {
        // If closing but advanced search is enabled, keep it on
      } else if (open) {
        // When opening, enable advanced search
        setUseAdvancedSearch(true);
      }
    }} />
      <CreateFloqSheet />
      
      {/* Create Floq FAB - Only on floqs page */}
      <CreateFloqFAB />
    </div>;
};

// Create Floq FAB Component
const CreateFloqFAB = () => {
  const {
    setShowCreateSheet
  } = useFloqUI();
  return <button onClick={() => setShowCreateSheet(true)} className="fixed bottom-24 right-4 px-6 py-3 rounded-full bg-gradient-to-r from-[hsl(279,100%,60%)] to-[hsl(320,100%,60%)] text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 font-medium" {...zIndex('system')}>
      <Plus size={20} />
      Create Floq
    </button>;
};