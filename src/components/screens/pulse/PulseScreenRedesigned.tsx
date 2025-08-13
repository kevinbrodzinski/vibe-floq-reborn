import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeo } from '@/hooks/useGeo';
import { useAuth } from '@/hooks/useAuth';
import { useWeather } from '@/hooks/useWeather';
import { useNearbyVenues } from '@/hooks/useNearbyVenues';
import { useTrendingVenues } from '@/hooks/useTrendingVenues';
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
import { LiveActivity } from '@/components/pulse/LiveActivity';
import { RecommendationsList, RecommendationItem } from '@/components/pulse/RecommendationsList';

// UI Components
import { SmartDiscoveryModal } from '@/components/ui/SmartDiscoveryModal';
import { AISummaryCollapsible } from '@/components/ui/AISummaryCollapsible';
import { LiveActivitySheet } from '@/components/pulse/LiveActivitySheet';

export const PulseScreenRedesigned: React.FC = () => {
  console.log('🎯 Pulse Redesign Active - Enhanced filtering & weather integration loaded');
  
  // Core state
  const { user } = useAuth();
  const { coords } = useGeo();
  const { data: weatherData, isLoading: weatherLoading } = useWeather();
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTime, setSelectedTime] = useState<TimeOption>('now');
  const [customDate, setCustomDate] = useState<Date>();
  const [selectedFilterKeys, setSelectedFilterKeys] = useState<string[]>([]);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);

  // Data hooks with enhanced filtering
  const { data: nearbyVenues = [] } = useNearbyVenues(
    coords?.lat ?? 0, 
    coords?.lng ?? 0, 
    2, // 2km radius
    { 
      pillKeys: selectedFilterKeys, 
      filterLogic: 'any', 
      limit: 50 
    }
  );
  const { data: trendingVenues = [] } = useTrendingVenues(
    2000, // 2km radius
    10,   // 10 results
    { 
      pillKeys: selectedFilterKeys, 
      filterLogic: 'any' 
    }
  );
  const { data: liveActivity = [] } = useLiveActivity(20);
  const { data: myFloqs = [] } = useMyActiveFloqs();
  
  // Enhanced filter system
  const { availableFilters, context } = usePulseFilters();
  
  // Enable realtime updates
  useLiveActivityRealtime();

  // Location data
  const location = useMemo(() => {
    // TODO: Get actual location from reverse geocoding
    return {
      city: 'San Francisco',
      neighborhood: 'Mission District'
    };
  }, [coords]);

  // Weather analysis for CTAs
  const weatherAnalysis = useMemo(() => {
    if (!weatherData) return null;
    
    const temp = weatherData.temperatureF;
    const precipitation = weatherData.precipitationChance || 0;
    const isGoodWeather = temp >= GOOD_WEATHER.minTemp && precipitation <= GOOD_WEATHER.maxPrecipitation;
    
    return {
      isGoodWeather,
      selectedCTA: isGoodWeather ? 'outdoor' : 'indoor'
    };
  }, [weatherData]);

  // Transform data into recommendations
  const recommendations: RecommendationItem[] = useMemo(() => {
    const venueRecs: RecommendationItem[] = nearbyVenues.map((venue: any) => ({
      id: venue.id,
      title: venue.name,
      type: 'venue' as const,
      distance: venue.distance_m || venue.dist_m || 0,
      vibe: venue.categories?.[0] || 'venue',
      rating: venue.rating || undefined,
      priceRange: venue.price_range as any,
      photoUrl: venue.photo_url && !venue.photo_url.includes('googleusercontent.com') 
        ? venue.photo_url 
        : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop',
      liveCount: venue.live_count || 0,
      vibeMatch: Math.floor(Math.random() * 40) + 60, // Mock vibe match
      weatherMatch: weatherAnalysis?.isGoodWeather ? 85 : 65, // Weather-based scoring
      tags: venue.canonical_tags || [],
      friends: [], // TODO: Connect to friends data
    }));

    const floqRecs: RecommendationItem[] = myFloqs.map((floq: any) => ({
      id: floq.id,
      title: floq.title,
      type: 'floq' as const,
      distance: floq.distance_meters || 0,
      vibe: floq.primary_vibe || 'social',
      participants: floq.participant_count,
      maxParticipants: floq.max_participants,
      host: {
        name: floq.host_name || 'Host',
        avatar: floq.host_avatar
      },
      vibeMatch: Math.floor(Math.random() * 30) + 70, // Higher match for user's floqs
      weatherMatch: weatherAnalysis?.isGoodWeather ? 80 : 70,
      friends: [], // TODO: Connect to friends data
    }));

    return [...venueRecs, ...floqRecs];
  }, [nearbyVenues, myFloqs, weatherAnalysis]);

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
        console.log('💡 Good weather detected - outdoor filters available');
      } else {
        // Subtle suggestion for indoor activities in bad weather  
        console.log('🏠 Indoor weather detected - cozy indoor filters available');
      }
    }
  }, [weatherAnalysis, selectedFilterKeys.length]);

  const handleRecommendationClick = useCallback((item: RecommendationItem) => {
    // Navigate to item detail page
    console.log('Navigate to:', item);
  }, []);

  const handleActivityClick = useCallback((activity: any) => {
    // Handle activity item click
    console.log('Activity clicked:', activity);
  }, []);

  const handleBookmark = useCallback((itemId: string) => {
    // Handle bookmark toggle
    console.log('Bookmark:', itemId);
  }, []);

  const handleShare = useCallback((item: RecommendationItem) => {
    // Handle share action
    console.log('Share:', item);
  }, []);

  const handleDirections = useCallback((item: RecommendationItem) => {
    // Handle directions action
    console.log('Directions to:', item);
  }, []);

  return (
    <div className="min-h-screen gradient-field">
      {/* Header */}
      <PulseHeader
        location={location}
        onLocationClick={() => setShowDiscoveryModal(true)}
        onAIInsightsClick={() => setShowAIInsights(!showAIInsights)}
        showAIInsights={showAIInsights}
      />

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

      {/* Search Bar */}
      <PulseSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
      />

      {/* Location & Weather Bar */}
      <PulseLocationWeatherBar
        location={location}
        weather={weatherData ? {
          condition: weatherData.condition,
          temperatureF: weatherData.temperatureF,
          feelsLikeF: weatherData.feelsLikeF,
          humidity: weatherData.humidity,
          windMph: weatherData.windMph,
          precipitationChance: weatherData.precipitationChance,
          updatedAt: new Date(weatherData.created_at)
        } : undefined}
        selectedTime={selectedTime}
        isLoading={weatherLoading}
      />

      {/* Date/Time Selector */}
      <div className="px-6 mb-6">
        <DateTimeSelector
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          customDate={customDate}
          onCustomDateChange={setCustomDate}
        />
      </div>

      {/* Filter Pills */}
      <div className="px-6 mb-6">
        <PulseFilterPills
          availableFilters={availableFilters}
          selectedFilterKeys={selectedFilterKeys}
          onToggleFilter={handleFilterToggle}
          maxVisible={8}
        />
      </div>

      {/* Content Sections */}
      <div className="space-y-6 pb-8">
        {/* Live Activity */}
        <div className="px-6">
          <LiveActivity
            activities={liveActivity}
            maxVisible={3}
            onViewMore={() => setActivitySheetOpen(true)}
            onActivityClick={handleActivityClick}
          />
        </div>

        {/* Main Recommendations */}
        <div className="px-6">
          <RecommendationsList
            recommendations={filteredRecommendations}
            title="Recommended for you"
            onItemClick={handleRecommendationClick}
            onBookmark={handleBookmark}
            onShare={handleShare}
            onDirections={handleDirections}
            maxVisible={10}
          />
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
    </div>
  );
};