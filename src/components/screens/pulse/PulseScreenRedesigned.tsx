import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useGeo } from '@/hooks/useGeo';
import { useAuth } from '@/hooks/useAuth';
import { usePulseWeatherNow, usePulseWeatherForecast } from '@/hooks/pulse/usePulseWeather';
import { usePulseNearbyVenues, usePulseTrendingVenues } from '@/hooks/pulse/usePulseVenues';
import { useVenuesOpenState } from '@/hooks/useVenueOpenState';
import { usePrefetchVenues } from '@/hooks/usePrefetchVenues';
import type { VenueSnapshot } from '@/hooks/useTrendingVenues';
import { useLiveActivity } from '@/hooks/useLiveActivity';
import { useMyActiveFloqs } from '@/hooks/useMyActiveFloqs';
import { usePulseFilters, GOOD_WEATHER } from '@/hooks/usePulseFilters';
import { useLiveActivityRealtime } from '@/hooks/useLiveActivityRealtime';

// Components
import { PulseHeader } from '@/components/pulse/PulseHeader';
import { PulseSearchBar } from '@/components/pulse/PulseSearchBar';
import { PulseLocationWeatherBar } from '@/components/pulse/PulseLocationWeatherBar';
import { DateTimeSelector, TimeOption } from '@/components/pulse/DateTimeSelector';
import { PulseFilterPills } from '@/components/pulse/PulseFilterPills';
import { ContextualFilterSuggestions } from '@/components/pulse/ContextualFilterSuggestions';
import { VenueCarousel, VenueCarouselItem } from '@/components/pulse/VenueCarousel';
import { VenueList } from '@/components/pulse/VenueList';
import { ViewToggle, ViewMode } from '@/components/pulse/ViewToggle';
import { LiveActivity } from '@/components/pulse/LiveActivity';
import { RecommendationsList } from '@/components/pulse/RecommendationsList';
import type { LocationDisplay, LiveActivityItem, PulseEvent } from '@/types/pulse';
import type { RecommendationItem } from '@/types/pulse';
import { VenueDetailSheet, type VenueLite } from '@/components/VenueDetailSheet';
// Image utilities no longer needed - VenueImage component handles all fallback logic
import { applyContextualFiltering, sortByContextualRelevance, getVenueStatus, type VenueData, type ContextualFilterOptions } from '@/lib/utils/contextualFiltering';

// UI Components
import { SmartDiscoveryModal } from '@/components/ui/SmartDiscoveryModal';
import { AISummaryCollapsible } from '@/components/ui/AISummaryCollapsible';
import { LiveActivitySheet } from '@/components/pulse/LiveActivitySheet';
import DistanceRadiusPicker from '@/components/filters/DistanceRadiusPicker';

export const PulseScreenRedesigned: React.FC = () => {
  // UI state (declared first so they can be used in hooks)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTime, setSelectedTime] = useState<TimeOption>('now');
  const [customDate, setCustomDate] = useState<Date>();
  const [selectedFilterKeys, setSelectedFilterKeys] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('carousel'); // Default to carousel
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [activeVenue, setActiveVenue] = useState<VenueLite | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [radiusKm, setRadiusKm] = useState(2); // Default 2km radius

  // Core state with corrected variable names
  const { user } = useAuth();
  const { coords } = useGeo();
  const { data: weatherNow, isLoading: weatherLoading } = usePulseWeatherNow();
  const { data: weatherForecast = [], isLoading: forecastLoading } = usePulseWeatherForecast();

  // Data hooks with corrected parameter names
  const { data: nearbyVenues = [], isLoading: nearbyLoading } = usePulseNearbyVenues({
    lat: coords?.lat ?? 0,
    lng: coords?.lng ?? 0,
    radiusKm: radiusKm,
    limit: 50
  });
  const { data: trendingVenues = [], isLoading: trendingLoading } = usePulseTrendingVenues({
    lat: coords?.lat ?? 0,
    lng: coords?.lng ?? 0,
    radiusM: Math.round(radiusKm * 1000),
    limit: 10
  });
  const { data: liveActivity = [] } = useLiveActivity(20);
  const { data: myFloqs = [] } = useMyActiveFloqs();
  
  // Enhanced filter system
  const { availableFilters, context: filterContext } = usePulseFilters();
  
  // Enable realtime updates
  useLiveActivityRealtime();

  // Location is now handled directly in PulseLocationWeatherBar component

  // Weather analysis using typed data
  const weatherAnalysis = useMemo(() => {
    if (!weatherNow) return null;
    
    const temp = weatherNow.temperatureF;
    const precipitation = weatherNow.precipitationChance || 0;
    const isGoodWeather = temp >= GOOD_WEATHER.minTemp && precipitation <= GOOD_WEATHER.maxPrecipitation;
    
    return {
      isGoodWeather,
      selectedCTA: isGoodWeather ? 'outdoor' : 'indoor',
      isForecast: weatherForecast.length > 0,
      forecastTime: weatherForecast[0]?.forecastTime || '',
      temperature: temp
    };
  }, [weatherNow, weatherForecast]);

  // Typed iteration over venue arrays
  const recommendations: RecommendationItem[] = useMemo(() => {
    if (!coords || (!nearbyVenues.length && !myFloqs.length)) return [];
    
    // Process nearby venues
    const venueRecs: RecommendationItem[] = nearbyVenues.map((venue: any, index: number) => {
      const stableVibeMatch = 60 + (venue.id?.charCodeAt(0) || index) % 40;
      const weatherMatch = weatherAnalysis?.isGoodWeather ? 85 : 65;
      
      return {
        id: venue.id,
        title: venue.name || 'Unknown Venue',
        type: 'venue' as const,
        subtitle: `${venue.categories?.[0] || 'Venue'}`,
        distance: venue.distance_m || venue.dist_m || 0,
        vibe: venue.categories?.[0] || 'venue',
        rating: venue.rating,
        priceRange: venue.price_tier,
        photoUrl: venue.photo_url,
        liveCount: venue.live_count || 0,
        vibeMatch: stableVibeMatch,
        weatherMatch,
        tags: venue.canonical_tags || [],
        friends: [],
        open_now: venue.open_now
      };
    });

    // Process trending venues
    const trendingRecs: RecommendationItem[] = trendingVenues.map((venue: any, index: number) => {
      const stableVibeMatch = 65 + (venue.id?.charCodeAt(0) || index) % 35;
      const weatherMatch = weatherAnalysis?.isGoodWeather ? 80 : 70;
      
      return {
        id: venue.id,
        title: venue.name || 'Unknown Venue',
        type: 'venue' as const,
        subtitle: `${venue.categories?.[0] || 'Trending'}`,
        distance: venue.distance_m || venue.dist_m || 0,
        vibe: venue.categories?.[0] || 'venue',
        rating: venue.rating,
        priceRange: venue.price_tier,
        photoUrl: venue.photo_url,
        liveCount: venue.live_count || 0,
        vibeMatch: stableVibeMatch,
        weatherMatch,
        tags: venue.canonical_tags || [],
        friends: [],
        open_now: venue.open_now
      };
    });

    return [...venueRecs, ...trendingRecs];
  }, [nearbyVenues, trendingVenues, myFloqs, weatherAnalysis, coords]);

  // Filter recommendations based on search and selected filters
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(rec => 
        rec.title.toLowerCase().includes(query) ||
        rec.vibe?.toLowerCase().includes(query) ||
        rec.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // TODO: Apply selected filter keys to recommendations
    // This would connect to the enhanced backend filtering system
    // For now, we'll do basic client-side filtering as a demo

    if (selectedFilterKeys.includes('outdoor_dining') && weatherAnalysis?.isGoodWeather) {
      // Boost outdoor venues in good weather
      filtered = filtered.map(rec => ({
        ...rec,
        weatherMatch: rec.type === 'venue' ? (rec.weatherMatch || 70) + 15 : rec.weatherMatch
      }));
    }

    if (selectedFilterKeys.includes('distance')) {
      // Filter to walking distance only
      filtered = filtered.filter(rec => (rec.distance || 0) <= 800);
    }

    return filtered.sort((a, b) => {
      const aScore = (a.vibeMatch || 70) + (a.weatherMatch || 70);
      const bScore = (b.vibeMatch || 70) + (b.weatherMatch || 70);
      return bScore - aScore;
    });
  }, [recommendations, searchQuery, selectedFilterKeys, weatherAnalysis]);

  // Event handlers
  const handleFilterToggle = useCallback((filterKey: string) => {
    setSelectedFilterKeys(prev => 
      prev.includes(filterKey)
        ? prev.filter(key => key !== filterKey)
        : [...prev, filterKey]
    );
  }, []);

  // Auto-suggest weather-appropriate filters when weather data changes
  React.useEffect(() => {
    if (weatherAnalysis && selectedFilterKeys.length === 0) {
      // Only auto-suggest if no filters are selected yet
      if (weatherAnalysis.isGoodWeather) {
        // Subtle suggestion for outdoor activities in good weather
      } else {
        // Subtle suggestion for indoor activities in bad weather  
      }
    }
  }, [weatherAnalysis, selectedFilterKeys.length]);

  // Get venue IDs for batch open state query
  const venueIds = useMemo(() => {
    if (!coords || filteredRecommendations.length === 0) return [];
    return filteredRecommendations
      .filter(item => item.type === 'venue')
      .map(item => item.id);
  }, [filteredRecommendations, coords]);

  // Fetch open state for all venues at once - only when we have venue IDs
  const { data: venuesOpenState = [] } = useVenuesOpenState(venueIds);

  // Background prefetching for better performance
  usePrefetchVenues();

  // Transform recommendations for carousel/list view
  const venueCarouselItems: VenueCarouselItem[] = useMemo(() => {
    const openStateMap = new Map((venuesOpenState as any[]).map((state: any) => [state.venue_id, state]));
    
    return filteredRecommendations
      .filter(item => item.type === 'venue')
      .map(item => {
        // Find the original venue data to get coordinates
        const originalVenue = nearbyVenues.find((v: any) => v.id === item.id) || 
                              trendingVenues.find((v: any) => v.venue_id === item.id);
        
        // Get open state for this venue
        const openState = openStateMap.get(item.id) as any;
        
        // Update subtitle to include open/closed status
        let enhancedSubtitle = item.subtitle || '';
        if (openState?.open_now === true) {
          enhancedSubtitle = `${item.subtitle || ''} • Open`;
        } else if (openState?.open_now === false) {
          enhancedSubtitle = `${item.subtitle || ''} • Closed`;
        }
        
        return {
          id: item.id,
          name: item.title,
          subtitle: enhancedSubtitle,
          photoUrl: item.photoUrl, // Already processed with contextual fallbacks
          distance: item.distance,
          rating: item.rating,
          vibeMatch: item.vibeMatch,
          weatherMatch: item.weatherMatch,
          liveCount: item.liveCount,
          tags: item.tags,
          // Add coordinates and temperature with proper type handling
          lat: (originalVenue as any)?.lat || null,
          lng: (originalVenue as any)?.lng || null,
          temperatureF: weatherAnalysis?.temperature || null,
        };
      });
  }, [filteredRecommendations, nearbyVenues, trendingVenues, weatherAnalysis, venuesOpenState]);

  // Get non-venue recommendations for separate display
  const otherRecommendations = useMemo(() => {
    return filteredRecommendations.filter(item => item.type !== 'venue');
  }, [filteredRecommendations]);

  const handleRecommendationClick = useCallback((item: RecommendationItem) => {
    if (item.type === 'venue') {
      // Convert RecommendationItem to VenueLite for the sheet
      const venue: VenueLite = {
        id: item.id,
        name: item.title,
        photo_url: item.photoUrl,
        categories: item.tags || [],
        canonical_tags: item.tags || [],
        distance_m: item.distance,
        rating: item.rating,
        price_tier: item.priceRange, // RecommendationItem uses priceRange field
        // Note: lat/lng not available from RecommendationItem
        // Would need to be fetched or stored differently
      };
      setActiveVenue(venue);
      setSheetOpen(true);
    } else {
      // TODO: Handle floq clicks
    }
  }, []);

  const handleVenueClick = useCallback((venueId: string) => {
    // Find venue in our data and open sheet
    const venue = [...nearbyVenues, ...trendingVenues]
      .find((v: any) => v.id === venueId || v.venue_id === venueId);
    
    if (venue) {
      const venueLite: VenueLite = {
        id: (venue as any).id || (venue as any).venue_id,
        name: venue.name || 'Unknown Venue',
        photo_url: venue.photo_url,
        categories: venue.categories || [],
        canonical_tags: venue.canonical_tags || [],
        distance_m: venue.distance_m,
        lat: (venue as any).lat,
        lng: (venue as any).lng,
        website: (venue as any).website,
        reservation_url: (venue as any).reservation_url,
        rating: (venue as any).rating,
        price_tier: (venue as any).price_tier,
      };
      setActiveVenue(venueLite);
      setSheetOpen(true);
    }
  }, [nearbyVenues, trendingVenues]);

  const handleCreatePlan = useCallback((venue: VenueLite) => {
    // Navigate to plan/floq creation with venue pre-selected
    window.location.href = `/plans/new?venue_id=${venue.id}`;
  }, []);

  const handleActivityClick = useCallback((activity: any) => {
    // Handle activity item click
  }, []);

  const handleBookmark = useCallback((itemId: string) => {
    // Handle bookmark toggle
  }, []);

  const handleShare = useCallback((item: RecommendationItem) => {
    // Handle share action
  }, []);

  const handleDirections = useCallback((item: RecommendationItem) => {
    // Handle directions action
  }, []);

  // Show loading state while waiting for location
  const isInitialLoading = !coords && (nearbyLoading || trendingLoading);

  return (
    <div className="min-h-screen gradient-field">
      {/* Header with proper location typing */}
      <PulseHeader
        location={{ city: 'Current Location' } as LocationDisplay}
        onLocationClick={() => setShowDiscoveryModal(true)}
        onAIInsightsClick={() => setShowAIInsights(!showAIInsights)}
        showAIInsights={showAIInsights}
      />

      {/* Loading State */}
      {isInitialLoading && (
        <div className="flex-1 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/80">Getting your location...</p>
          </div>
        </div>
      )}

      {/* Modals */}
      <SmartDiscoveryModal
        isOpen={showDiscoveryModal}
        onClose={() => setShowDiscoveryModal(false)}
        userLocation={coords ? { lat: coords.lat, lng: coords.lng } : undefined}
      />

      <LiveActivitySheet 
        open={activitySheetOpen} 
        onClose={() => setActivitySheetOpen(false)} 
      />

      {/* AI Summary (collapsible) */}
      <AnimatePresence>
        {showAIInsights && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6"
          >
            <AISummaryCollapsible />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content - only show when we have coordinates */}
      {!isInitialLoading && coords && (
        <>
          {/* Search Bar */}
          <PulseSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
          />

      <PulseLocationWeatherBar
        weather={weatherNow ? {
          condition: weatherNow.condition,
          temperatureF: weatherNow.temperatureF,
          feelsLikeF: weatherNow.feelsLikeF,
          humidity: weatherNow.humidity,
          windMph: weatherNow.windMph,
          precipitationChance: weatherNow.precipitationChance || 0,
          updatedAt: new Date(weatherNow.created_at),
          isForecast: false,
          forecastTime: weatherForecast?.[0]?.forecastTime
        } : undefined}
        selectedTime={selectedTime}
        isLoading={weatherLoading || forecastLoading}
      />

      {/* Live Activity */}
      <div className="px-6 mb-6">
        <LiveActivity
          activities={liveActivity.map((event: PulseEvent): any => ({
            ...event,
            id: String(event.id),
            event_type: event.event_type as any // Type cast for compatibility
          }))}
          maxVisible={3}
          onViewMore={() => setActivitySheetOpen(true)}
          onActivityClick={handleActivityClick}
        />
      </div>

      {/* Date/Time Selector */}
      <div className="px-6 mb-6">
        <DateTimeSelector
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          customDate={customDate}
          onCustomDateChange={setCustomDate}
        />
      </div>

      {/* Collapsible Filters Section */}
      <div className="px-6 mb-6">
        {/* Filter Toggle Button */}
        <motion.button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="flex items-center justify-between w-full p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 mb-4 hover:bg-white/15 transition-colors"
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Filter className="w-4 h-4 text-white flex-shrink-0" />
            <span className="text-white font-medium">
              Filters {selectedFilterKeys.length > 0 && `(${selectedFilterKeys.length})`}
            </span>
            {/* Show preview of active filters when collapsed */}
            {!filtersExpanded && selectedFilterKeys.length > 0 && (
              <div className="flex items-center space-x-1 ml-2 overflow-hidden">
                <span className="text-white/60 text-sm">•</span>
                <span className="text-white/80 text-sm truncate">
                  {selectedFilterKeys.slice(0, 2).join(', ')}
                  {selectedFilterKeys.length > 2 && '...'}
                </span>
              </div>
            )}
          </div>
          {filtersExpanded ? (
            <ChevronUp className="w-4 h-4 text-white" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white" />
          )}
        </motion.button>

        {/* Collapsible Filter Content */}
        <AnimatePresence>
          {filtersExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-4">
                {/* Contextual Filter Suggestions */}
                {filterContext && (
                  <div>
                    <ContextualFilterSuggestions
                      context={filterContext}
                      onFilterSelect={handleFilterToggle}
                      selectedFilters={selectedFilterKeys}
                    />
                  </div>
                )}

                {/* Distance Radius Picker */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <DistanceRadiusPicker
                    valueKm={radiusKm}
                    onChange={setRadiusKm}
                  />
                </div>

                {/* Filter Pills */}
                <div>
                  <PulseFilterPills
                    availableFilters={availableFilters}
                    selectedFilterKeys={selectedFilterKeys}
                    onToggleFilter={handleFilterToggle}
                    maxVisible={8}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content Sections */}
      <div className="space-y-6 pb-8">
        {/* Main Recommendations */}
        <div className="px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Recommended for you</h2>
            <ViewToggle mode={viewMode} onModeChange={setViewMode} />
          </div>

          {viewMode === 'carousel' ? (
            <div className="-mx-6">
              <VenueCarousel
                items={venueCarouselItems}
                loading={nearbyLoading || trendingLoading}
                onOpen={handleVenueClick}
                className="px-2"
                userLat={coords?.lat || null}
                userLng={coords?.lng || null}
              />
            </div>
          ) : (
            <VenueList
              items={venueCarouselItems}
              loading={nearbyLoading || trendingLoading}
              onOpen={handleVenueClick}
            />
          )}

          {/* Other recommendations (Floqs, Events) */}
          {otherRecommendations.length > 0 && (
            <div className="mt-8">
              <RecommendationsList
                recommendations={otherRecommendations as any[]} // Type cast for compatibility
                title="Events & Floqs"
                onItemClick={handleRecommendationClick as any}
                onBookmark={handleBookmark}
                onShare={handleShare as any}
                onDirections={handleDirections as any}
                maxVisible={6}
              />
            </div>
          )}
        </div>

        {/* Context-aware messages */}
        {selectedFilterKeys.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
              <p className="text-white/80 text-sm">
                Showing results filtered by your preferences • 
                <button
                  onClick={() => setSelectedFilterKeys([])}
                  className="text-white hover:text-white/80 underline ml-1"
                >
                  Clear all filters
                </button>
              </p>
            </div>
          </motion.div>
        )}

        {/* Empty state */}
        {filteredRecommendations.length === 0 && !searchQuery && selectedFilterKeys.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 text-center py-12"
          >
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
              <h3 className="text-white font-medium mb-2">Discovering amazing places...</h3>
              <p className="text-white/70 text-sm">We're finding the perfect spots for you based on your location and preferences.</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Venue Detail Sheet */}
        </>
      )}

      <VenueDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        venue={activeVenue}
        userLat={coords?.lat}
        userLng={coords?.lng}
        onCreatePlan={handleCreatePlan}
      />
    </div>
  );
};