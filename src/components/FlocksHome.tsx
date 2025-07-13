import React, { useRef } from 'react';
import { RefreshCcw, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { StoriesBar } from '@/components/StoriesBar';
import { RecommendationsStrip } from '@/components/RecommendationsStrip';
import { FilterModal } from '@/components/FilterModal';
import { CreateFloqSheet } from '@/components/CreateFloqSheet';
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
  const { data: myFlocks = [], isLoading: myFlocksLoading } = useMyFlocks();
  const { data: nearbyFlocks = [], isLoading: nearbyLoading } = useNearbyFlocks({ 
    geo, 
    filters: { ...filters, searchQuery } // Include search query in filters
  });
  const { data: suggestions = [], isLoading: suggestionsLoading } = useFloqSuggestions({ 
    geo 
  });

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
                {myFlocks.length}
              </Badge>
            </div>
            <StoriesBar
              flocks={myFlocks}
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
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : nearbyFlocks.length > 0 ? (
              <div className="space-y-3">
                {nearbyFlocks.slice(0, 5).map((floq) => (
                  <div
                    key={floq.id}
                    onClick={() => handleFloqPress(floq.id)}
                    className="p-4 bg-card rounded-lg border border-border/40 hover:border-border cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">
                          {floq.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs capitalize">
                            {floq.primary_vibe}
                          </Badge>
                          <span>•</span>
                          <span>{floq.participant_count} members</span>
                          <span>•</span>
                          <span>{formatDistance(floq.distance_meters)} away</span>
                        </div>
                      </div>
                      {floq.is_joined && (
                        <Badge variant="default" className="text-xs">
                          Joined
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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