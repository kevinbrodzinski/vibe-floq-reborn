import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Hooks
import { useGeo } from '@/hooks/useGeo';
import { useAuth } from '@/hooks/useAuth';
import { useWeather } from '@/hooks/useWeather';
import { useUserVibe } from '@/hooks/useUserVibe';
import { useNearbyVenues } from '@/hooks/useNearbyVenues';
import { useTrendingVenues } from '@/hooks/useTrendingVenues';
import { useLiveActivity } from '@/hooks/useLiveActivity';
import { useMyActiveFloqs } from '@/hooks/useMyActiveFloqs';

// New Components
import { PulseHeader } from '@/components/pulse/PulseHeader';
import { PulseSearchBar } from '@/components/pulse/PulseSearchBar';
import { LocationWeatherBar } from '@/components/pulse/LocationWeatherBar';
import { DateTimeSelector, type TimeFilter } from '@/components/pulse/DateTimeSelector';

import { PulseFilterPills } from '@/components/pulse/PulseFilterPills';
import { LiveActivity } from '@/components/pulse/LiveActivity';
import { RecommendationsList, type RecommendationItem } from '@/components/pulse/RecommendationsList';

// Existing Components
import { LiveActivitySheet } from '@/components/pulse/LiveActivitySheet';
import { SmartDiscoveryModal } from '@/components/ui/SmartDiscoveryModal';

// Utils and Types
import { GOOD_WEATHER, type Vibe } from '@/hooks/usePulseFilters';
import { cn } from '@/lib/utils';
import { getPulseWindow } from '@/utils/timeWindow';
import { useReverseGeocode, type CityLocation } from '@/hooks/useLocationSearch';

export const PulseScreenRedesigned: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { coords } = useGeo();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTime, setSelectedTime] = useState<TimeFilter>('now');
  const [selectedFilterKeys, setSelectedFilterKeys] = useState<string[]>([]);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [showLiveActivitySheet, setShowLiveActivitySheet] = useState(false);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [distanceMaxM, setDistanceMaxM] = useState<number>(2000); // 2km default
  const [selectedCity, setSelectedCity] = useState<CityLocation | null>(null); // For location override

  // Get time window for selected time filter
  const timeWindow = useMemo(() => getPulseWindow(selectedTime), [selectedTime]);
  
  // Reverse geocode current location to get city/state
  const { data: currentCity } = useReverseGeocode(coords?.lat, coords?.lng);
  
  // Use selected city or current city
  const activeCity = selectedCity || currentCity;
  
  // Data hooks - pass dateTime to weather for future forecasts
  const { data: weatherData } = useWeather(timeWindow.start.toISOString());
  const { data: userVibe } = useUserVibe(profile?.id || null);
  const { data: nearbyVenues = [] } = useNearbyVenues(
    coords?.lat ?? 0, 
    coords?.lng ?? 0, 
    {
      radiusKm: distanceMaxM / 1000, // Convert to km
      limit: 25,
      pillKeys: selectedFilterKeys.length > 0 ? selectedFilterKeys : [],
      filterLogic: 'any'
    }
  );
  const { data: trendingVenues = [] } = useTrendingVenues(
    coords?.lat ?? 0,
    coords?.lng ?? 0,
    {
      radiusM: distanceMaxM,
      limit: 10,
      pillKeys: selectedFilterKeys.length > 0 ? selectedFilterKeys : [],
      filterLogic: 'any'
    }
  );
  const { data: liveActivity = [] } = useLiveActivity();
  const { data: myFloqs = [] } = useMyActiveFloqs(timeWindow);

  // Weather normalization
  const normalizedWeather = useMemo(() => {
    if (!weatherData) {
      return {
        tempF: 70,
        condition: 'sunny' as const,
        precipChancePct: 0,
        isGoodWeather: true,
        fetchedAt: new Date().toISOString()
      };
    }

    const condition = weatherData.condition === 'clear' || weatherData.condition === 'sunny' ? 'sunny' :
                     weatherData.condition === 'clouds' || weatherData.condition === 'cloudy' ? 'cloudy' :
                     weatherData.condition === 'rain' ? 'rain' :
                     weatherData.condition === 'snow' ? 'snow' :
                     weatherData.condition === 'mist' || weatherData.condition === 'fog' ? 'fog' :
                     'mixed';

    const weather = {
      tempF: Math.round(weatherData.temperatureF || weatherData.tempF || 70),
      condition,
      precipChancePct: weatherData.precipChancePct || 0,
      fetchedAt: weatherData.created_at || new Date().toISOString()
    };

    return {
      ...weather,
      isGoodWeather: GOOD_WEATHER(weather)
    };
  }, [weatherData]);

  // Vibe normalization
  const currentVibe: Vibe = useMemo(() => {
    const vibeTag = userVibe?.vibe?.toLowerCase();
    switch (vibeTag) {
      case 'high_energy':
      case 'hype':
        return 'high_energy';
      case 'social':
        return 'social';
      case 'chill':
      case 'relaxed':
        return 'chill';
      case 'romantic':
      case 'intimate':
        return 'romantic';
      case 'family':
        return 'family';
      default:
        return 'social'; // Default fallback
    }
  }, [userVibe?.vibe]);

  // Context for conditional filters
  const filterContext = useMemo(() => ({
    time: { localDate: new Date() }, // TODO: Use selectedTime to compute actual date
    vibe: currentVibe,
    weather: {
      tempF: normalizedWeather.tempF,
      condition: normalizedWeather.condition,
      precipChancePct: normalizedWeather.precipChancePct
    },
    city: {
      hasMajorConcert: false, // TODO: Connect to real city events data
      hasMajorSports: false,
      hasFestival: false
    },
    friends: {
      recentCheckinCount: Array.isArray(liveActivity) ? liveActivity.length : 0,
      activeFloqsCount: Array.isArray(myFloqs) ? myFloqs.length : 0,
      trendingFloqsNearbyCount: 0 // TODO: Calculate from trending data
    }
  }), [normalizedWeather, currentVibe, liveActivity, myFloqs]);

  // Transform data for recommendations
  const recommendations = useMemo((): RecommendationItem[] => {
    const venueRecs: RecommendationItem[] = nearbyVenues.map((venue, index: number) => {
      // Enhanced mock data for better presentation
      const mockDescriptions = [
        "A cozy spot perfect for catching up with friends",
        "Trendy atmosphere with craft cocktails and live music",
        "Popular local hangout with great vibes",
        "Intimate setting with excellent food and drinks",
        "Vibrant venue known for its energetic crowd"
      ];
      
      const mockRatings = [4.2, 4.5, 4.1, 4.7, 4.3, 4.6, 4.4];
      
      // Calculate walk and drive times - handle both string and number distance
      const distanceM = typeof venue.distance_m === 'string' ? Number(venue.distance_m) : venue.distance_m;
      const walkMin = Math.max(1, Math.round((distanceM || 0) / 80)); // ~80 m/min walking speed
      const driveMin = Math.round(((distanceM || 0) / 1000) / 30 * 60); // ~30 km/h city driving
      
      return {
        id: venue.id,
        title: venue.name,
        type: 'venue' as const,
        distance: distanceM,
        walkTime: walkMin,
        driveTime: driveMin,
        category: venue.categories?.[0] || 'Venue',
        description: mockDescriptions[index % mockDescriptions.length],
        rating: mockRatings[index % mockRatings.length],
        priceLevel: (['$', '$$', '$$$'] as const)[index % 3],
        isOpen: Math.random() > 0.2, // 80% open - mock data
        vibeMatch: venue.vibe_score ? Math.round(venue.vibe_score * 100) : Math.floor(Math.random() * 40) + 60,
        weatherMatch: normalizedWeather.isGoodWeather ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 40) + 50,
        overallScore: Math.floor(Math.random() * 40) + 60,
        imageUrl: venue.photo_url,
        tags: venue.canonical_tags || venue.categories || [],
        friendsGoing: Math.random() > 0.7 ? [
          { name: 'Alex', avatar: undefined },
          { name: 'Sam', avatar: undefined }
        ] : undefined,
        regularsCount: venue.live_count || Math.floor(Math.random() * 5) + 1 // Use live_count or mock
      };
    });

    // Add trending venues to the mix
    const trendingRecs: RecommendationItem[] = trendingVenues.slice(0, 5).map((venue, index: number) => {
      const distanceM = typeof venue.distance_m === 'string' ? Number(venue.distance_m) : venue.distance_m;
      const walkMin = Math.max(1, Math.round((distanceM || 0) / 80));
      const driveMin = Math.round(((distanceM || 0) / 1000) / 30 * 60);
      
      return {
        id: venue.venue_id,
        title: venue.name,
        type: 'venue' as const,
        distance: distanceM,
        walkTime: walkMin,
        driveTime: driveMin,
        category: venue.categories?.[0] || 'Trending',
        description: `Trending now with ${venue.people_now || 0} people`,
        rating: 4.0 + Math.random() * 1, // 4.0-5.0 for trending venues
        priceLevel: (['$', '$$', '$$$'] as const)[index % 3],
        isOpen: true, // Assume trending venues are open
        vibeMatch: venue.vibe_score ? Math.round(venue.vibe_score * 100) : Math.floor(Math.random() * 20) + 80, // Higher for trending
        weatherMatch: normalizedWeather.isGoodWeather ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 30) + 60,
        overallScore: venue.trend_score ? Math.round(venue.trend_score * 100) : Math.floor(Math.random() * 20) + 80,
        imageUrl: venue.photo_url,
        tags: venue.canonical_tags || venue.categories || [],
        regularsCount: venue.people_now || Math.floor(Math.random() * 10) + 5 // Use people_now for trending
      };
    });

    const floqRecs: RecommendationItem[] = myFloqs.map((floq) => ({
      id: floq.id,
      title: floq.title || floq.name || 'Unnamed Floq',
      type: 'floq' as const,
      distance: undefined, // Floqs don't have distance in this context
      category: 'Floq',
      description: `Active floq with ${floq.member_count || 0} members`,
      participants: floq.member_count,
      maxParticipants: 50, // Default max
      hostName: 'Floq Host',
      hostAvatar: undefined,
      vibeMatch: Math.floor(Math.random() * 40) + 70, // Floqs tend to match better
      overallScore: Math.floor(Math.random() * 40) + 70
    }));

    return [...venueRecs, ...trendingRecs, ...floqRecs];
  }, [nearbyVenues, trendingVenues, myFloqs, normalizedWeather.isGoodWeather]);

  // Filter recommendations by search and selected filters
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(rec =>
        rec.title.toLowerCase().includes(query) ||
        rec.category?.toLowerCase().includes(query) ||
        rec.description?.toLowerCase().includes(query) ||
        rec.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply selected filter keys
    if (selectedFilterKeys.length > 0) {
      // For now, implement basic filtering - in production this would use the venue's canonical_tags
      filtered = filtered.filter(rec => {
        // Mock filter matching based on venue properties and selected filters
        const hasRelevantTags = rec.tags?.some(tag => {
          const tagLower = tag.toLowerCase();
          return selectedFilterKeys.some(filterKey => {
            // Map filter keys to searchable terms
            const filterMappings: Record<string, string[]> = {
              'coffee_spots': ['coffee', 'cafe', 'espresso'],
              'brunch': ['brunch', 'breakfast', 'morning'],
              'dinner_spots': ['dinner', 'restaurant', 'dining'],
              'bars_clubs': ['bar', 'club', 'nightlife', 'drinks'],
              'outdoor_dining': ['outdoor', 'patio', 'terrace'],
              'rooftop_bars': ['rooftop', 'roof', 'skybar'],
              'cozy_lounges': ['lounge', 'cozy', 'intimate'],
              'live_music': ['music', 'live', 'concert', 'band'],
              'happy_hour': ['happy', 'drinks', 'bar'],
              'karaoke': ['karaoke', 'sing', 'music']
            };
            
            const searchTerms = filterMappings[filterKey] || [filterKey.replace('_', ' ')];
            return searchTerms.some(term => tagLower.includes(term));
          });
        });
        
        // If no tags match, include venue if it's a basic filter like 'distance' or 'smart'
        const basicFilters = ['distance', 'energy', 'venue_type', 'vibe_type', 'floqs', 'smart'];
        const hasBasicFilter = selectedFilterKeys.some(key => basicFilters.includes(key));
        
        return hasRelevantTags || hasBasicFilter;
      });
    }
    
    return filtered;
  }, [recommendations, searchQuery, selectedFilterKeys]);

  // Handlers
  const handleProfileClick = () => {
    navigate('/profile');
  };



  const handleCalendarClick = () => {
    // For now, show an alert - in production this would open a date picker modal
    alert('Calendar functionality coming soon! This will allow you to select specific dates and times for discovery.');
    setSelectedTime('custom');
  };

  const getCurrentLocationDisplay = () => {
    if (selectedCity) return selectedCity.name;
    if (currentCity) return currentCity.name;
    if (coords) return 'Getting location...';
    return 'Location unavailable';
  };

  const handleLocationChange = (city: CityLocation) => {
    setSelectedCity(city);
    // In production, you might want to update the coords to the new city's coordinates
    // This would trigger new venue queries for the selected city
    console.log('Location changed to:', city.name);
  };

  const handleRecommendationClick = (item: RecommendationItem) => {
    if (item.type === 'venue') {
      navigate(`/venues/${item.id}`);
    } else if (item.type === 'floq') {
      navigate(`/floqs/${item.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-field">
      {/* Header */}
      <PulseHeader onProfileClick={handleProfileClick} />

      {/* Modals */}
      <SmartDiscoveryModal
        isOpen={showDiscoveryModal}
        onClose={() => setShowDiscoveryModal(false)}
        userLocation={coords ? { lat: coords.lat, lng: coords.lng } : undefined}
      />

      <LiveActivitySheet 
        open={showLiveActivitySheet} 
        onClose={() => setShowLiveActivitySheet(false)} 
      />

      {/* Search Bar */}
      <PulseSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search venues, vibes, or floqs..."
      />

      {/* Location & Weather Status Bar */}
      <LocationWeatherBar
        currentLocation={getCurrentLocationDisplay()}
        onLocationChange={handleLocationChange}
        weather={{
          tempF: normalizedWeather.tempF,
          condition: normalizedWeather.condition,
          precipChancePct: normalizedWeather.precipChancePct
        }}
      />

      {/* Date/Time Selector */}
      <DateTimeSelector
        value={selectedTime}
        onChange={setSelectedTime}
        onCalendarClick={handleCalendarClick}
      />



      {/* Dynamic Filter Pills */}
      <div className="px-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-white/70 font-medium">Smart Filters</span>
          <span className="text-xs text-white/50">
            ({selectedFilterKeys.length} selected)
          </span>
        </div>
        <PulseFilterPills
          {...filterContext}
          selectedKeys={selectedFilterKeys}
          onToggle={(key, selected) => {
            setSelectedFilterKeys(prev => 
              selected 
                ? [...prev, key]
                : prev.filter(k => k !== key)
            );
          }}
          maxVisible={showAllFilters ? undefined : 12}
          onShowMore={() => setShowAllFilters(true)}
          className="mb-2"
        />
      </div>

      {/* Content Sections */}
      <div className="space-y-8 pb-8">
        {/* Live Activity */}
        <div className="px-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white text-lg flex items-center gap-2">
              Live Activity
            </h2>
            <button
              onClick={() => setShowLiveActivitySheet(true)}
              className="text-xs font-medium text-white/70 hover:text-white transition-colors"
            >
              View more →
            </button>
          </div>
          <LiveActivity
            maxItems={3}
            onViewMore={() => setShowLiveActivitySheet(true)}
          />
        </div>

        {/* Recommendations */}
        <div className="px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`recommendations-${selectedFilterKeys.join('-')}-${searchQuery}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <RecommendationsList
                items={filteredRecommendations}
                title="Discover" // Future rename placeholder
                maxItems={8}
                onItemClick={handleRecommendationClick}
                onViewMore={() => {
                  // TODO: Navigate to full recommendations view
                  console.log('View more recommendations');
                }}
                loading={false}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredRecommendations.length === 0 && (
          <div className="px-6 text-center py-12">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-white font-medium mb-2">No matches found</h3>
            <p className="text-white/70 text-sm mb-4">
              Try adjusting your filters or search terms
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFilterKeys([]);
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};