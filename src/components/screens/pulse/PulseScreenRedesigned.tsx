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
import { DateTimeSelector, type TimeFilter } from '@/components/pulse/DateTimeSelector';
import { PulseWeatherCard } from '@/components/pulse/PulseWeatherCard';
import { PulseFilterPills } from '@/components/pulse/PulseFilterPills';
import { LiveActivity } from '@/components/pulse/LiveActivity';
import { RecommendationsList, type RecommendationItem } from '@/components/pulse/RecommendationsList';

// Existing Components
import { LiveActivitySheet } from '@/components/pulse/LiveActivitySheet';
import { SmartDiscoveryModal } from '@/components/ui/SmartDiscoveryModal';

// Utils and Types
import { GOOD_WEATHER, type Vibe } from '@/hooks/usePulseFilters';
import { cn } from '@/lib/utils';

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

  // Data hooks
  const { data: weatherData } = useWeather();
  const { data: userVibe } = useUserVibe(profile?.id || null);
  const { data: nearbyVenues = [] } = useNearbyVenues(
    coords?.lat ?? 0, 
    coords?.lng ?? 0, 
    2, // 2km radius
    { 
      pillKeys: selectedFilterKeys.length > 0 ? selectedFilterKeys : undefined,
      filterLogic: 'any' 
    }
  );
  const { data: trendingVenues = [] } = useTrendingVenues(2000, 10, {
    pillKeys: selectedFilterKeys.length > 0 ? selectedFilterKeys : undefined,
    filterLogic: 'any'
  });
  const { data: liveActivity = [] } = useLiveActivity();
  const { data: myFloqs = [] } = useMyActiveFloqs();

  // Weather normalization
  const normalizedWeather = useMemo(() => {
    if (!weatherData) {
      return {
        tempF: 70,
        condition: 'sunny' as const,
        precipChancePct: 0,
        isGoodWeather: true
      };
    }

    const condition = weatherData.condition === 'clear' ? 'sunny' :
                     weatherData.condition === 'clouds' ? 'cloudy' :
                     weatherData.condition === 'rain' ? 'rain' :
                     weatherData.condition === 'snow' ? 'snow' :
                     weatherData.condition === 'mist' || weatherData.condition === 'fog' ? 'fog' :
                     'mixed';

    const weather = {
      tempF: Math.round(weatherData.tempF),
      condition,
      precipChancePct: weatherData.precipChancePct || 0
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
    const venueRecs: RecommendationItem[] = nearbyVenues.map((venue: any) => ({
      id: venue.id,
      title: venue.name,
      type: 'venue' as const,
      distance: venue.distance_m,
      category: venue.categories?.[0] || 'Venue',
      description: venue.description,
      rating: venue.rating,
      isOpen: venue.is_open,
      vibeMatch: Math.floor(Math.random() * 40) + 60, // TODO: Real vibe matching
      overallScore: Math.floor(Math.random() * 40) + 60,
      imageUrl: venue.photo_url,
      tags: venue.canonical_tags || venue.categories
    }));

    const floqRecs: RecommendationItem[] = myFloqs.map((floq: any) => ({
      id: floq.id,
      title: floq.title,
      type: 'floq' as const,
      distance: floq.distance_meters,
      category: 'Floq',
      description: floq.description,
      participants: floq.participant_count,
      maxParticipants: floq.max_participants,
      hostName: floq.host_name,
      hostAvatar: floq.host_avatar,
      vibeMatch: Math.floor(Math.random() * 40) + 70, // Floqs tend to match better
      overallScore: Math.floor(Math.random() * 40) + 70
    }));

    return [...venueRecs, ...floqRecs];
  }, [nearbyVenues, myFloqs]);

  // Filter recommendations by search
  const filteredRecommendations = useMemo(() => {
    if (!searchQuery.trim()) return recommendations;
    
    const query = searchQuery.toLowerCase();
    return recommendations.filter(rec =>
      rec.title.toLowerCase().includes(query) ||
      rec.category?.toLowerCase().includes(query) ||
      rec.description?.toLowerCase().includes(query) ||
      rec.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [recommendations, searchQuery]);

  // Handlers
  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleWeatherCta = () => {
    // Auto-select appropriate filters based on weather
    const weatherFilters = normalizedWeather.isGoodWeather
      ? ['outdoor_dining', 'rooftop_bars', 'open_air_events']
      : ['cozy_lounges', 'indoor_entertainment', 'movie_nights'];
    
    setSelectedFilterKeys(prev => {
      const newKeys = [...prev];
      weatherFilters.forEach(filter => {
        if (!newKeys.includes(filter)) {
          newKeys.push(filter);
        }
      });
      return newKeys;
    });
  };

  const handleRecommendationClick = (item: RecommendationItem) => {
    if (item.type === 'venue') {
      navigate(`/venue/${item.id}`);
    } else if (item.type === 'floq') {
      navigate(`/floq/${item.id}`);
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

      {/* Date/Time Selector */}
      <DateTimeSelector
        value={selectedTime}
        onChange={setSelectedTime}
        onCalendarClick={() => {
          // TODO: Open calendar modal
          console.log('Calendar clicked');
        }}
      />

      {/* Weather Card */}
      <div className="px-6 mb-6">
        <PulseWeatherCard
          weather={{
            tempF: normalizedWeather.tempF,
            condition: normalizedWeather.condition,
            precipChancePct: normalizedWeather.precipChancePct,
            isGoodWeather: normalizedWeather.isGoodWeather,
            fetchedAt: weatherData?.fetchedAt
          }}
          selectedTime={selectedTime}
          onOutdoorCta={normalizedWeather.isGoodWeather ? handleWeatherCta : undefined}
          onIndoorCta={!normalizedWeather.isGoodWeather ? handleWeatherCta : undefined}
        />
      </div>

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
          maxVisible={12}
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