import React, { useRef, useCallback, useEffect } from 'react';
import { RefreshCcw, Filter, Search } from 'lucide-react';
import { useSession } from '@supabase/auth-helpers-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { FloqStatusBadge } from '@/components/FloqStatusBadge';
import { StoriesBar } from '@/components/StoriesBar';
import { RecommendationsStrip } from '@/components/RecommendationsStrip';
import { FilterModal } from '@/components/FilterModal';
import { CreateFloqSheet } from '@/components/CreateFloqSheet';
import { FloqCard } from '@/components/floq/FloqCard';
import { useMyFlocks } from '@/hooks/useMyFlocks';
import { useNearbyFlocks } from '@/hooks/useNearbyFlocks';
import { useFloqSuggestions } from '@/hooks/useFloqSuggestions';
import { useEnhancedGeolocation } from '@/hooks/useEnhancedGeolocation';
import { useFloqUI } from '@/contexts/FloqUIContext';
import { formatDistance } from '@/utils/formatDistance';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useDrag } from '@use-gesture/react';

interface FlocksHomeProps {
  geo?: { lat: number; lng: number };
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const FlocksHome: React.FC<FlocksHomeProps> = ({
  geo: propGeo,
  onRefresh,
  isRefreshing = false,
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
  } = useFloqUI();

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const refreshRef = useRef<HTMLDivElement>(null);
  const session = useSession();
  
  // Use enhanced geolocation hook with better permission handling
  const { coords, permissionDenied, error: geoError, requestLocation } = useEnhancedGeolocation({ enableHighAccuracy: true });
  const geo = propGeo || coords;

  // Pull-to-refresh gesture handling
  const bind = useDrag(
    ({ last, movement: [, my], cancel, canceled }) => {
      if (my < -70 && !canceled) {
        cancel();
        handleRefresh();
      }
    },
    {
      axis: 'y',
      filterTaps: true,
      pointer: { touch: true }
    }
  );

  // Data hooks with search query filter
  const { data: myFlocks = [], isLoading: myFlocksLoading, error: myFlocksError } = useMyFlocks();

  // Error logging for My Flocks
  useEffect(() => {
    if (myFlocksError) console.error('[MyFlocks] query failed', myFlocksError);
  }, [myFlocksError]);
  const { data: nearbyFlocks = [], isLoading: nearbyLoading } = useNearbyFlocks({ 
    geo, 
    filters: { ...filters, searchQuery } // Include search query in filters
  });
  const { data: suggestions = [], isLoading: suggestionsLoading } = useFloqSuggestions({ 
    geo 
  });

  // Memoized handlers for FloqCard actions
  const handleBoost = useCallback((floqId: string) => {
    // TODO: Implement boost logic
    console.log('Boosting floq:', floqId);
  }, []);

  const handleLeave = useCallback((floqId: string) => {
    // TODO: Implement leave logic  
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
    queryClient.invalidateQueries({ queryKey: ["nearby-flocks"] });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    onRefresh?.();
  };

  return (
    <div className="flex flex-col h-full bg-background" ref={refreshRef} {...bind()}>
      {/* Geolocation Permission Banner */}
      {permissionDenied && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-yellow-600 dark:text-yellow-400">
              📍 Location access needed to see nearby flocks
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={requestLocation}
              className="text-xs h-6"
            >
              Enable
            </Button>
          </div>
        </div>
      )}
      {/* Header with search and filters */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search flocks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>
          </form>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFiltersModal(true)}
            className={cn(
              "relative",
              hasActiveFilters && "border-primary bg-primary/10"
            )}
          >
            <Filter className="w-4 h-4" />
            {hasActiveFilters && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 text-[10px]">
                !
              </Badge>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(isRefreshing && "animate-spin")}
          >
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-4">
          {/* My Flocks Stories */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">My Flocks</h2>
              <Badge variant="secondary" className="text-xs">
                {myFlocks?.length || 0}
              </Badge>
            </div>
            <StoriesBar
              flocks={myFlocks || []}
              onCreatePress={handleCreatePress}
              onFlockPress={handleFloqPress}
              isLoading={myFlocksLoading}
            />
          </section>

          {/* AI Recommendations */}
          {suggestions.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Recommended for You
                </h2>
                <Badge variant="outline" className="text-xs">
                  AI ✨
                </Badge>
              </div>
              <RecommendationsStrip
                geo={geo}
                onSelectFloq={(floq) => handleFloqPress(floq.floq_id)}
              />
            </section>
          )}

          {/* Nearby Flocks */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">
                Nearby Flocks
              </h2>
              <Badge variant="secondary" className="text-xs">
                {nearbyFlocks.length}
              </Badge>
            </div>
            
            {nearbyLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-5 bg-card/30 border border-border/20 backdrop-blur-md rounded-xl">
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
                  </div>
                ))}
              </div>
            ) : nearbyFlocks.length > 0 ? (
              <ul role="list" aria-label="Nearby floqs" className="space-y-4">
                {nearbyFlocks.slice(0, 5).map((floq) => (
                  <li key={floq.id}>
                    <FloqCard 
                      floq={floq}
                      onBoost={floq.is_joined ? handleBoost : undefined}
                      onLeave={floq.is_joined ? handleLeave : undefined}
                      hasUserBoosted={floq.hasUserBoosted}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No nearby flocks found</p>
                <p className="text-sm mt-1">Try adjusting your filters or create one!</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modals */}
      <FilterModal />
      <CreateFloqSheet />
    </div>
  );
};