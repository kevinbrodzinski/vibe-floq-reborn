import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useGeo } from '@/hooks/useGeo';
import { useAuth } from '@/hooks/useAuth';
import { useWeather } from '@/hooks/useWeather';
import { useWeatherForecast } from '@/hooks/useWeatherForecast';
import { useVenuesOpenState } from '@/hooks/useVenueOpenState';
import { useNearbyVenues } from '@/hooks/useNearbyVenues';
import { usePrefetchVenues } from '@/hooks/usePrefetchVenues';
import { useTrendingVenues, type VenueSnapshot } from '@/hooks/useTrendingVenues';
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
import { RecommendationsList, RecommendationItem } from '@/components/pulse/RecommendationsList';
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

  // Core state (using selectedTime from above)
  const { user } = useAuth();
  const { coords } = useGeo();
  const { data: weatherData, isLoading: weatherLoading } = useWeather() as { 
    data: import('@/hooks/useWeather').Weather | undefined, 
    isLoading: boolean 
  };
  const { data: forecastData, isLoading: forecastLoading } = useWeatherForecast(selectedTime) as { 
    data: import('@/hooks/useWeatherForecast').WeatherForecast | undefined, 
    isLoading: boolean 
  };

      // Data hooks with enhanced filtering - only fetch when we have real coordinates
  const { data: nearbyVenues = [], isLoading: nearbyLoading } = useNearbyVenues(
    coords?.lat ?? 0,
    coords?.lng ?? 0,
    radiusKm,
    {
      pillKeys: selectedFilterKeys,
      filterLogic: 'any',
      limit: 50
    }
  ) as { data: import('@/hooks/useNearbyVenues').Venue[], isLoading: boolean };
  const { data: trendingVenues = [], isLoading: trendingLoading } = useTrendingVenues(
    Math.round(radiusKm * 1000), // Convert km to meters
    10,   // 10 results
    {
      pillKeys: selectedFilterKeys,
      filterLogic: 'any'
    }
  );
  const { data: liveActivity = [] } = useLiveActivity(20);
  const { data: myFloqs = [] } = useMyActiveFloqs();
  
  // Enhanced filter system
  const { availableFilters, context: filterContext } = usePulseFilters();
  
  // Enable realtime updates
  useLiveActivityRealtime();

  // Location is now handled directly in PulseLocationWeatherBar component

  // Weather analysis for CTAs - uses forecast data when available
  const weatherAnalysis = useMemo(() => {
    const activeWeatherData = forecastData || weatherData;
    if (!activeWeatherData) return null;
    
    const temp = activeWeatherData.temperatureF;
    const precipitation = activeWeatherData.precipitationChance || 0;
    const isGoodWeather = temp >= GOOD_WEATHER.minTemp && precipitation <= GOOD_WEATHER.maxPrecipitation;
    
    return {
      isGoodWeather,
      selectedCTA: isGoodWeather ? 'outdoor' : 'indoor',
      isForecast: !!forecastData,
      forecastTime: forecastData?.forecastTime
    };
  }, [weatherData, forecastData]);

  // Transform data into recommendations with contextual filtering
  const recommendations: RecommendationItem[] = useMemo(() => {
    // Early return if no data or still loading coordinates
    if (!coords || (!nearbyVenues?.length && !myFloqs?.length)) return [];
    
    // Apply contextual filtering to venues if context is available
    let filteredVenues = nearbyVenues;
    
    if (filterContext && nearbyVenues?.length > 0) {
      // Convert to VenueData format for contextual filtering (optimized)
      const venues: VenueData[] = nearbyVenues.map((venue: any) => ({
        id: venue.id,
        name: venue.name,
        categories: venue.categories || [],
        canonical_tags: venue.canonical_tags || [],
        hours: venue.hours,
        price_level: venue.price_level,
        rating: venue.rating,
        live_count: venue.live_count || 0,
        distance_m: venue.distance_m || venue.dist_m || 0
      }));
      
      // Apply contextual filtering and sorting (cached time)
      const currentTime = new Date();
      const filterOptions: ContextualFilterOptions = {
        context: filterContext,
        selectedPillKeys: selectedFilterKeys,
        currentTime,
        userPreferences: {
          minimumRating: 2.5,
          maxDistance: 10000
        }
      };
      
      const contextuallyFiltered = applyContextualFiltering(venues, filterOptions);
      const contextuallySorted = sortByContextualRelevance(contextuallyFiltered, filterOptions);
      
      // Convert back to original format (optimized with Map lookup)
      const venueMap = new Map(nearbyVenues.map((v: any) => [v.id, v]));
      filteredVenues = contextuallySorted
        .map(venue => venueMap.get(venue.id))
        .filter(Boolean);
    }

    // Cache venue status calculations and use stable mock values
    const venueRecs: RecommendationItem[] = filteredVenues.map((venue: any, index: number) => {
      // Use index-based stable "random" values instead of Math.random()
      const stableVibeMatch = 60 + (venue.id?.charCodeAt(0) || index) % 40;
      const weatherMatch = weatherAnalysis?.isGoodWeather ? 85 : 65;
      
      // Optimize venue status check - only if hours exist
      let statusText = '';
      if (venue.hours) {
        const venueStatus = getVenueStatus({
          id: venue.id,
          name: venue.name,
          hours: venue.hours,
          categories: venue.categories || [],
          canonical_tags: venue.canonical_tags || []
        });
        statusText = venueStatus.isOpen === true ? ' • Open' : 
                    venueStatus.isOpen === false ? ' • Closed' : '';
      }

      return {
        id: venue.id,
        title: venue.name || 'Unknown Venue',
        type: 'venue' as const,
        subtitle: `${venue.categories?.[0] || 'Venue'}${statusText}`,
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
      };
    });

    // Optimize floq recommendations with stable values
    const floqRecs: RecommendationItem[] = (myFloqs || []).map((floq: any, index: number) => {
      const stableVibeMatch = 70 + (floq.id?.charCodeAt(0) || index) % 30;
      const weatherMatch = weatherAnalysis?.isGoodWeather ? 80 : 70;
      
      return {
        id: floq.id,
        title: floq.title || 'Untitled Floq',
        type: 'floq' as const,
        distance: floq.distance_meters || 0,
        vibe: floq.primary_vibe || 'social',
        participants: floq.participant_count || 0,
        maxParticipants: floq.max_participants || 10,
        host: {
          name: floq.host_name || 'Host',
          avatar: floq.host_avatar
        },
        vibeMatch: stableVibeMatch,
        weatherMatch,
        friends: [],
      };
    });

    return [...venueRecs, ...floqRecs];
  }, [nearbyVenues, myFloqs, weatherAnalysis, filterContext, selectedFilterKeys, coords]);

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
    const openStateMap = new Map(venuesOpenState.map(state => [state.venue_id, state]));
    
    return filteredRecommendations
      .filter(item => item.type === 'venue')
      .map(item => {
        // Find the original venue data to get coordinates
        const originalVenue = nearbyVenues.find((v: any) => v.id === item.id) || 
                             trendingVenues.find((v: any) => v.id === item.id);
        
        // Get open state for this venue
        const openState = openStateMap.get(item.id);
        
        // Update subtitle to include open/closed status
        let enhancedSubtitle = item.subtitle;
        if (openState?.open_now === true) {
          enhancedSubtitle = `${item.subtitle} • Open`;
        } else if (openState?.open_now === false) {
          enhancedSubtitle = `${item.subtitle} • Closed`;
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
          // Add coordinates and temperature
          lat: originalVenue?.lat || null,
          lng: originalVenue?.lng || null,
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
    const venue = [...(nearbyVenues || []), ...(trendingVenues || [])]
      .find((v: any) => v.id === venueId);
    
    if (venue) {
      const venueLite: VenueLite = {
        id: venue.id,
        name: venue.name || 'Unknown Venue',
        photo_url: venue.photo_url,
        categories: venue.categories || [],
        canonical_tags: venue.canonical_tags || [],
        distance_m: venue.distance_m || venue.dist_m,
        lat: venue.lat,
        lng: venue.lng,
        website: venue.website,
        reservation_url: venue.reservation_url,
        rating: venue.rating,
        price_tier: venue.price_tier,
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
      {/* Header */}
      <PulseHeader
        location={location}
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

      {/* Location & Weather Bar */}
      <PulseLocationWeatherBar
        weather={(forecastData || weatherData) ? {
          condition: (forecastData || weatherData)!.condition,
          temperatureF: (forecastData || weatherData)!.temperatureF,
          feelsLikeF: (forecastData || weatherData)!.feelsLikeF,
          humidity: (forecastData || weatherData)!.humidity,
          windMph: (forecastData || weatherData)!.windMph,
          precipitationChance: (forecastData || weatherData)!.precipitationChance || 0,
          updatedAt: new Date((forecastData || weatherData)!.created_at),
          isForecast: !!forecastData,
          forecastTime: forecastData?.forecastTime
        } : undefined}
        selectedTime={selectedTime}
        isLoading={weatherLoading || forecastLoading}
      />

      {/* Live Activity */}
      <div className="px-6 mb-6">
        <LiveActivity
          activities={liveActivity}
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
                recommendations={otherRecommendations}
                title="Events & Floqs"
                onItemClick={handleRecommendationClick}
                onBookmark={handleBookmark}
                onShare={handleShare}
                onDirections={handleDirections}
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