import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, MapPin, Users, Clock, Star, TrendingUp, Sparkles, Flame, Activity, Coffee, Zap } from 'lucide-react';
import { useGeo } from '@/hooks/useGeo';
import { useActiveFloqs } from '@/hooks/useActiveFloqs';
import { useNearbyVenues } from '@/hooks/useNearbyVenues';
import { useMyActiveFloqs } from '@/hooks/useMyActiveFloqs';
// import { useWeeklyAI } from '@/hooks/useWeeklyAI';
import { useSocialSuggestions } from '@/hooks/useSocialSuggestions';
import { useTrendingVenues } from '@/hooks/useTrendingVenues';
import { useLiveActivity } from '@/hooks/useLiveActivity';
import { useWeather } from '@/hooks/useWeather';
import { usePulseBadges } from '@/hooks/usePulseBadges';
import { useAuth } from '@/hooks/useAuth';
import { TrendingVenueCard } from '@/components/ui/TrendingVenueCard';
import { LiveActivityFeed } from '@/components/ui/LiveActivityFeed';
import { VoiceSearchButton } from '@/components/ui/VoiceSearchButton';
import { WeatherAwareSuggestion } from '@/components/ui/WeatherAwareSuggestion';
import { AISuggestionCard } from '@/components/ui/AISuggestionCard';
import { AISummaryCollapsible } from '@/components/ui/AISummaryCollapsible';
import { SmartDiscoveryModal } from '@/components/ui/SmartDiscoveryModal';
import { useNavigate } from 'react-router-dom';
import { EnhancedRecommendationCard } from '@/components/ui/EnhancedRecommendationCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useVibeMatch } from '@/hooks/useVibeMatch';
import { FilterChip } from '@/components/ui/FilterChip';
import { SmartFilterPill } from '@/components/filters/SmartFilterPill';
import { PersonalizedVenueSection } from '@/components/pulse/PersonalizedVenueSection';
import { NearbyVenuesSheet } from '@/components/NearbyVenuesSheet';
import { useNovaSnap } from '@/hooks/useNovaSnap';
import { PulseFilter, WALKING_THRESHOLD_M, HIGH_ENERGY_SCORE } from '@/pages/pulse/filters';
import { useLiveActivityRealtime } from '@/hooks/useLiveActivityRealtime';
import { LiveFeedPreview } from '@/components/pulse/LiveFeedPreview';
import { LiveActivitySheet } from '@/components/pulse/LiveActivitySheet';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { PersonalizationSettings } from '@/components/planning/PersonalizationSettings';



interface PulseRecommendation {
  id: string;
  title: string;
  type: 'venue' | 'floq' | 'plan';
  distance?: string | number;
  distance_meters?: number;
  vibe?: string;
  participants?: number;
  participant_count?: number;
  maxParticipants?: number;
  starts_at?: string;
  ends_at?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  description?: string;
  address?: string;
  live_count?: number;
  venue_id?: string;
  tags?: string[];
  friends_going_names?: string[];
  friends_going_avatars?: string[];
  friends?: string[];
  host?: {
    name: string;
    avatar?: string;
  };
  category?: string;
}

export const PulseScreen: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showAIInsights, setShowAIInsights] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'now' | 'tonight' | 'weekend'>('now');
  const [showIndoorOnly, setShowIndoorOnly] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [showAISummary, setShowAISummary] = useState(false);
  const navigate = useNavigate();
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  const [modalFriends, setModalFriends] = useState<{name: string, avatar?: string}[]>([]);
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [personalizationSheetOpen, setPersonalizationSheetOpen] = useState(false);
  const [nearbyVenuesSheetOpen, setNearbyVenuesSheetOpen] = useState(false);
  
  // Smart suggestions state
  const { preferSmartSuggestions } = useNovaSnap();
  
  // Analytics - fire real events (replace with your analytics service)
  const handleSmartToggle = () => {
    if (preferSmartSuggestions) {
      // Replace with real analytics: posthog.capture('smart_disabled') or analytics.track('smart_disabled')
      console.log('Analytics: smart_disabled');
    } else {
      // Replace with real analytics: posthog.capture('smart_enabled') or analytics.track('smart_enabled')  
      console.log('Analytics: smart_enabled');
    }
  };

  const handleSmartBrowseOpen = () => {
    // Replace with real analytics: posthog.capture('smart_browse_open') or analytics.track('smart_browse_open')
    console.log('Analytics: smart_browse_open');
    setPersonalizationSheetOpen(true);
  };

  const handleVenueTap = (venueId: string) => {
    // Handle venue tap - could navigate to venue detail or perform other actions
    console.log('Venue tapped:', venueId);
    navigate(`/venue/${venueId}`);
  };

  const handleViewAllVenues = () => {
    setNearbyVenuesSheetOpen(true);
  };

  // Realtime live activity updates
  useLiveActivityRealtime();

  /* 2-A  chips state */
  const [filters, setFilters] = useState<Set<PulseFilter>>(new Set());

  /* 2-B  helper */
  const toggle = (f: PulseFilter) =>
    setFilters(prev =>
      prev.has(f)
        ? new Set([...prev].filter(x => x !== f))
        : new Set(prev).add(f),
    );

  // Mock gamification data - in production this would come from user profile
  const gamificationData = {
    badges: [
      {
        id: '1',
        name: 'Venue Explorer',
        description: 'Visit 10 different venues',
        icon: <MapPin className="w-4 h-4" />,
        progress: 7,
        maxProgress: 10,
        isUnlocked: false,
        color: 'from-blue-500/20 to-blue-600/20'
      },
      {
        id: '2',
        name: 'Social Butterfly',
        description: 'Join 5 floqs',
        icon: <Users className="w-4 h-4" />,
        progress: 3,
        maxProgress: 5,
        isUnlocked: false,
        color: 'from-purple-500/20 to-purple-600/20'
      },
      {
        id: '3',
        name: 'Coffee Connoisseur',
        description: 'Visit 3 coffee shops',
        icon: <Coffee className="w-4 h-4" />,
        progress: 3,
        maxProgress: 3,
        isUnlocked: true,
        color: 'from-orange-500/20 to-orange-600/20'
      }
    ],
    totalPoints: 1250,
    level: 8,
    streak: 3
  };

  // Data fetching hooks
  const { coords } = useGeo();
  const { data: activeFloqsPages } = useActiveFloqs();
  const activeFloqs = activeFloqsPages?.pages?.flatMap(page => page.data) ?? [];
  const { data: nearbyVenues = [] } = useNearbyVenues(coords?.lat ?? 0, coords?.lng ?? 0, 0.3);
  const nearbyVenuesArr = Array.isArray(nearbyVenues) ? (nearbyVenues as any[]) : [];
  const { data: myFloqs = [] } = useMyActiveFloqs();
  const { suggestions: socialSuggestions = [] } = useSocialSuggestions(1000);
  
  // Real-time Pulse data
  const radiusArg = filters.has('walking') ? WALKING_THRESHOLD_M : 2000;
  const { data: trendingVenues = [] } = useTrendingVenues(radiusArg, 5);
  const { data: livePages = [] } = useLiveActivity();
  const liveActivity = livePages;
  const { data: weatherData, isLoading: weatherLoading, error: weatherError } = useWeather();
  const { data: pulseBadges } = usePulseBadges(user?.id);

  // Debug weather data
  console.log('Weather Debug:', { weatherData, weatherLoading, weatherError });

  /* 3 · Derive "my floq" ID set once */
  const myFloqIds = useMemo(
    () => new Set(myFloqs.map(f => f.id)),
    [myFloqs],
  );

  // Loading and error states
  const isLoading = !activeFloqs.length && !nearbyVenuesArr.length;
  const hasError = false; // Add error handling if needed

  // Use real weather data or fallback to mock
  const weather = weatherData ? {
    condition: mapWeatherCondition((weatherData as any).condition),
    temperatureF: (weatherData as any).temperatureF,
    feelsLikeF: (weatherData as any).feelsLikeF,
    humidity: (weatherData as any).humidity,
    windMph: (weatherData as any).windMph,
    icon: (weatherData as any).icon
  } : {
    condition: 'clear' as const,
    temperatureF: 72,
    feelsLikeF: 72,
    humidity: 50,
    windMph: 5,
    icon: '01d'
  };

  // Helper function to map weather conditions to UI expectations
  function mapWeatherCondition(condition: string): 'clear' | 'clouds' | 'rain' | 'snow' | 'drizzle' | 'thunderstorm' | 'mist' | 'fog' {
    switch (condition) {
      case 'clear': return 'clear';
      case 'clouds': return 'clouds';
      case 'rain': return 'rain';
      case 'drizzle': return 'drizzle';
      case 'thunderstorm': return 'thunderstorm';
      case 'snow': return 'snow';
      case 'mist': return 'mist';
      case 'fog': return 'fog';
      default: return 'clear';
    }
  }

  /* 4-A · Apply filters to trending venues */
  const visibleTrending = useMemo(() => {
    return trendingVenues.filter(v => {
      if (filters.has('walking') &&
          v.distance_m != null &&
          v.distance_m > WALKING_THRESHOLD_M) return false;

      if (filters.has('highEnergy') &&
          v.vibe_tag !== 'hype' &&
          v.trend_score <= HIGH_ENERGY_SCORE) return false;

      if (filters.has('socialVibes') &&
          v.vibe_tag !== 'social') return false;

      if (filters.has('myFloqs') &&
          !myFloqIds.has(v.venue_id)) return false;

      return true;
    });
  }, [trendingVenues, filters, myFloqIds]);

  /* 4-B · Apply filters to nearby floqs */
  const visibleFloqs = useMemo(() => {
    return activeFloqs.filter(f => {
      if (filters.has('walking') &&
          f.distance_meters != null &&
          f.distance_meters > WALKING_THRESHOLD_M) return false;

      if (filters.has('highEnergy') &&
          f.primary_vibe !== 'hype') return false;

      if (filters.has('socialVibes') &&
          f.primary_vibe !== 'social') return false;

      if (filters.has('myFloqs') &&
          !myFloqIds.has(f.id)) return false;

      return true;
    });
  }, [activeFloqs, filters, myFloqIds]);

  // Transform data into recommendations
  const recommendations = useMemo(() => {
      const venueRecommendations: PulseRecommendation[] = nearbyVenuesArr.map((venue: any) => ({
    id: venue.id,
    title: venue.name,
    type: 'venue' as const,
    distance_meters: typeof venue.distance_m === 'number' ? venue.distance_m : (venue.dist_m ?? 0),
    distance: typeof venue.distance_m === 'number'
      ? `${(venue.distance_m / 1000).toFixed(1)}km`
      : (typeof venue.dist_m === 'number' ? `${(venue.dist_m / 1000).toFixed(1)}km` : 'Nearby'),
    vibe: venue.categories?.[0] || 'Venue',
    category: venue.categories?.[0],
    // rating: venue.rating, // Not available in new venue type
    // address: venue.address, // Not available in new venue type
    live_count: 0, // Default live count since it's not in the new venue type
    venue_id: venue.id
    }));

    const floqRecommendations: PulseRecommendation[] = visibleFloqs.map(floq => ({
      id: floq.id,
      title: floq.title,
      type: 'floq' as const,
      distance: floq.distance_meters ? `${(floq.distance_meters / 1000).toFixed(1)}km` : 'Nearby',
      vibe: floq.primary_vibe || 'social',
      participants: floq.participant_count,
      category: 'Floq',
      venue_id: floq.id
    }));

    return [...venueRecommendations, ...floqRecommendations];
  }, [nearbyVenues, visibleFloqs]);

  // Filter recommendations based on search and filters
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(rec => 
        rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rec.vibe ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Selected filters
    if (selectedFilters.length > 0) {
      filtered = filtered.filter(rec => {
        if (selectedFilters.includes('Walking distance') && (rec.distance_meters ?? 1e9) > WALKING_THRESHOLD_M) return false;
        if (selectedFilters.includes('High energy') && (rec.live_count || 0) < 10) return false;
        if (selectedFilters.includes('Social vibes') && !['social', 'hype', 'open'].includes(rec.vibe)) return false;
        if (selectedFilters.includes('My floqs') && rec.type === 'floq' && !myFloqs.some(f => f.id === rec.id)) return false;
        return true;
      });
    }

    // Time filter
    if (timeFilter === 'tonight') {
      filtered = filtered.filter(rec => 
        rec.category === 'Floq' || 
        ['bar', 'restaurant', 'nightclub'].includes(rec.category?.toLowerCase() || '')
      );
    } else if (timeFilter === 'weekend') {
      filtered = filtered.filter(rec => 
        rec.category === 'Floq' || 
        ['park', 'museum', 'cafe', 'restaurant'].includes(rec.category?.toLowerCase() || '')
      );
    }

    return filtered;
  }, [recommendations, searchQuery, selectedFilters, timeFilter, myFloqs]);

  // Dynamic quick suggestions based on real data
  const quickSuggestions = useMemo(() => {
    const suggestions = [];

    if (pulseBadges?.activeFloqs && pulseBadges.activeFloqs > 0) {
      suggestions.push({
        label: `${pulseBadges.activeFloqs} active floqs nearby`,
        filter: 'Active floqs'
      });
    }

    if (pulseBadges?.venuesDiscovered && pulseBadges.venuesDiscovered > 0) {
      suggestions.push({
        label: `${pulseBadges.venuesDiscovered} venues discovered`,
        filter: 'Venues'
      });
    }

    if (myFloqs.length > 0) {
      suggestions.push({
        label: `${myFloqs.length} of your floqs`,
        filter: 'My floqs'
      });
    }

    if (socialSuggestions.length > 0) {
      suggestions.push({
        label: `${socialSuggestions.length} friends nearby`,
        filter: 'Friends nearby'
      });
    }

    if (liveActivity.length > 0) {
      suggestions.push({
        label: `${liveActivity.length} live check-ins nearby`,
        filter: 'Live activity'
      });
    }

    return suggestions;
  }, [liveActivity.length, nearbyVenuesArr.length, myFloqs.length, socialSuggestions.length]);

  // Get vibe match data for all recommendations
  const { vibeMatch: globalVibeMatch } = useVibeMatch();

  // Helper function to get vibe match for a specific recommendation
  const getVibeMatchForRecommendation = (rec: PulseRecommendation) => {
    // For now, use global vibe match or fallback to random
    return globalVibeMatch?.matchPercentage || Math.floor(Math.random() * 40) + 60;
  };

  const handleQuickSuggestionClick = (filter: string) => {
    if (selectedFilters.includes(filter)) {
      setSelectedFilters(selectedFilters.filter(f => f !== filter));
    } else {
      setSelectedFilters([...selectedFilters, filter]);
    }
  };



  // Helper to extract city from address
  const getCityFromAddress = (address?: string | null) => {
    if (!address || typeof address !== 'string') return '';
    const parts = address.split(',').map(s => s.trim());
    if (parts.length >= 2) return parts[parts.length - 2];
    return parts[0];
  };

  return (
    <div className="min-h-screen bg-gradient-field">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-6 pt-16">
        <button
          className="p-2 rounded-full hover:bg-secondary/20 transition-colors"
          onClick={() => setShowDiscoveryModal(true)}
          aria-label="Open Smart Discovery Modal"
        >
          <MapPin className="h-6 w-6 text-white/80" />
        </button>
        <div className="relative flex flex-col items-center justify-center w-full">
          {/* Animated gradient wave background */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[220px] h-12 pointer-events-none z-0 animate-pulse-wave">
            <svg viewBox="0 0 220 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <defs>
                <linearGradient id="pulseWaveGradient" x1="0" y1="0" x2="220" y2="0" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#a5b4fc" />
                  <stop offset="0.5" stopColor="#f472b6" />
                  <stop offset="1" stopColor="#facc15" />
                </linearGradient>
              </defs>
              <path d="M0 24 Q 55 0 110 24 T 220 24 Q 165 48 110 24 T 0 24" stroke="url(#pulseWaveGradient)" strokeWidth="6" fill="none" opacity="0.18"/>
            </svg>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-indigo-300 via-pink-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-lg z-10">
            pulse
          </h1>
          <p className="text-base md:text-lg text-white/70 font-medium z-10">Discovering around you</p>
        </div>
        <button
          className="p-2 rounded-full hover:bg-secondary/20 transition-colors"
          onClick={() => setShowAISummary((v) => !v)}
          aria-label="Show AI Insights"
        >
          <Zap className="h-6 w-6 text-white/80" />
        </button>
      </div>

      {/* Smart Discovery Modal */}
      <SmartDiscoveryModal
        isOpen={showDiscoveryModal}
        onClose={() => setShowDiscoveryModal(false)}
        userLocation={coords ? { lat: coords.lat, lng: coords.lng } : undefined}
      />

      {/* Live Activity Sheet */}
      <LiveActivitySheet 
        open={activitySheetOpen} 
        onClose={() => setActivitySheetOpen(false)} 
      />

      {/* Personalization Settings Sheet */}
      <Sheet open={personalizationSheetOpen} onOpenChange={setPersonalizationSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] p-0 rounded-t-2xl">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Personalization Settings</h2>
            <PersonalizationSettings />
          </div>
        </SheetContent>
      </Sheet>

      {/* Nearby Venues Sheet */}
      <NearbyVenuesSheet
        isOpen={nearbyVenuesSheetOpen}
        onClose={() => setNearbyVenuesSheetOpen(false)}
        onVenueTap={handleVenueTap}
      />

      {/* AI Summary Collapsible (controlled) */}
      <div className="px-6">
        {showAISummary && <AISummaryCollapsible />}
      </div>

      {/* Search Bar */}
      <div className="px-6 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
          <input
            type="text"
            placeholder="Search venues, vibes, or floqs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-20 py-4 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:glow-secondary transition-all duration-300"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <VoiceSearchButton
              onVoiceInput={(text) => setSearchQuery(text)}
              disabled={false}
            />
          </div>
        </div>
      </div>

      {/* Time Filters - Right under search */}
      <div className="px-6 mb-4">
        <div className="flex gap-2">
          {(['now', 'tonight', 'weekend'] as const).map((time) => (
            <button
              key={time}
              onClick={() => setTimeFilter(time)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                timeFilter === time
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              {time.charAt(0).toUpperCase() + time.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Filters - Right under time filters */}
      <div className="px-6 mb-4">
        <div className="flex flex-wrap gap-2">
          {quickSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleQuickSuggestionClick(suggestion.filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                selectedFilters.includes(suggestion.filter)
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Chips - Right under quick filters */}
      <div className="px-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-white/70" />
          <span className="text-sm text-white/70">Filters:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={filters.has('walking')}
            onClick={() => toggle('walking')}
          >
            Walking distance
          </FilterChip>

          <FilterChip
            active={filters.has('highEnergy')}
            onClick={() => toggle('highEnergy')}
          >
            High energy
          </FilterChip>

          <FilterChip
            active={filters.has('socialVibes')}
            onClick={() => toggle('socialVibes')}
          >
            Social vibes
          </FilterChip>

          <FilterChip
            active={filters.has('myFloqs')}
            onClick={() => toggle('myFloqs')}
          >
            My floqs
          </FilterChip>

          <SmartFilterPill />
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-6">
        {/* AI Insight Section */}
        {/* {showAIInsights && aiSuggestion && (
          <div className="px-6">
            <AISuggestionCard
              suggestion={aiSuggestion}
              onRefresh={refetchAI}
              loading={aiLoading}
              source={aiSource}
            />
          </div>
        )} */}

        {/* Live Activity Feed */}
        <div className="px-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-white" />
              <h2 className="font-bold text-white text-lg">Live Activity</h2>
            </div>
            <button
              onClick={() => setActivitySheetOpen(true)}
              className="text-xs font-medium text-white/70 hover:text-white transition-colors"
            >
              View more →
            </button>
          </div>
          <LiveFeedPreview max={3} />
        </div>

        {/* Weather-Aware Suggestion */}
        <div className="px-6">
          <WeatherAwareSuggestion
            weather={weather}
            onIndoorToggle={() => setShowIndoorOnly(!showIndoorOnly)}
          />
        </div>

        {/* Trending Venues Section */}
        {visibleTrending && visibleTrending.length > 0 && (
          <div className="px-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="font-bold text-white text-lg">🔥 Trending Now</h2>
            </div>
            <div className="space-y-4">
              {visibleTrending.slice(0, 3).map((venue) => (
                <TrendingVenueCard
                  key={venue.venue_id}
                  venue={{
                    id: venue.venue_id,
                    name: venue.name,
                    distance_m: venue.distance_m,
                    people_now: venue.people_now,
                    last_seen_at: venue.last_seen_at,
                    trend_score: venue.trend_score,
                    vibe_tag: venue.vibe_tag
                  }}
                  onJoin={() => console.log('Join venue:', venue.name)}
                  onShare={() => console.log('Share venue:', venue.name)}
                  onLike={() => console.log('Like venue:', venue.name)}
                  onChat={() => console.log('Chat venue:', venue.name)}
                />
              ))}
            </div>
          </div>
        )}





        {/* Main Recommendations List with Smooth Transitions & Consistent Height */}
        <div className="min-h-[500px]"> {/* Prevent layout shift between different list lengths */}
          <AnimatePresence mode="wait">
          {(preferSmartSuggestions && (import.meta.env.VITE_USE_EDGE_RECS ?? 'true') === 'true') ? (
            <motion.div 
              key="smart-recommendations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.15 }}
              className="px-6"
            >
              <div>
                <PersonalizedVenueSection 
                  maxResults={3} 
                  onConfigureClick={handleSmartBrowseOpen}
                />
                <div className="mt-4 text-center">
                  <button
                    onClick={handleViewAllVenues}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/20 text-sm font-medium"
                  >
                    View All Nearby Venues
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            filteredRecommendations.length > 0 && (
              <motion.div 
                key="regular-recommendations"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.15 }}
                className="px-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-white" />
                  <h2 className="font-bold text-white text-lg">Recommended for you</h2>
                </div>
                {preferSmartSuggestions && (import.meta.env.VITE_USE_EDGE_RECS ?? 'true') === 'false' && (
                  <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-amber-200 text-sm">
                      🔧 Smart recommendations temporarily unavailable - showing nearby venues instead
                    </p>
                  </div>
                )}
                <div className="space-y-4">
                  {filteredRecommendations.map((rec, index) => {
                    // Mock host and vibe match for demo
                    const host = rec.type === 'floq' ? {
                      name: 'Alex Johnson',
                      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
                    } : rec.type === 'venue' ? {
                      name: 'Venue Host',
                      avatar: '',
                    } : undefined;
                    
                    // Use real vibe match data
                    const vibeMatchPercentage = getVibeMatchForRecommendation(rec);
                    
                    // Friends going mock (replace with real data if available)
                    const friends = (rec.friends_going_names || rec.friends || []).map((name: string, i: number) => ({
                      name,
                      avatar: rec.friends_going_avatars?.[i],
                    }));
                    
                    return (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <EnhancedRecommendationCard
                          item={{
                            id: rec.id,
                            title: rec.title,
                            type: rec.type,
                            distance: rec.distance_meters || 0,
                            vibe: rec.vibe,
                            participants: rec.participant_count || rec.participants,
                            maxParticipants: rec.maxParticipants,
                            startTime: rec.starts_at || rec.startTime,
                            endTime: rec.ends_at || rec.endTime,
                            status: 'open',
                            description: rec.description,
                            location: getCityFromAddress(rec.address ? String(rec.address) : ''),
                            host,
                            tags: rec.tags,
                            friends,
                            vibeMatch: vibeMatchPercentage,
                          }}
                          onAction={(action, id) => {
                            if (action === 'friends') {
                              setModalFriends(friends);
                              setFriendsModalOpen(true);
                            }
                            // ...other actions
                          }}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )
          )}
          </AnimatePresence>
        </div>

        {/* Friends Modal */}
        <Dialog open={friendsModalOpen} onOpenChange={setFriendsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Friends Going</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {modalFriends.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  {f.avatar && <img src={f.avatar} alt={f.name} className="w-8 h-8 rounded-full" />}
                  <span className="text-base text-foreground">{f.name}</span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Loading State */}
        {isLoading && (
          <div className="px-6 text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/70">Discovering amazing places...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredRecommendations.length === 0 && (
          <div className="px-6 text-center py-12">
            <Search className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">No matches found</h3>
            <p className="text-white/70">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>

    </div>
  );
};