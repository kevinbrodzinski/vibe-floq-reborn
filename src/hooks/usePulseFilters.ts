import { useMemo } from 'react';
import { useGeo } from '@/hooks/useGeo';
import { useWeather } from '@/hooks/useWeather';
import { useAuth } from '@/hooks/useAuth';
import { useMyActiveFloqs } from '@/hooks/useMyActiveFloqs';

export interface PulseFilterOption {
  key: string;
  label: string;
  priority: 1 | 2 | 3; // 1 = highest priority (⭐), 2 = medium (✨), 3 = standard
  category: 'core' | 'time' | 'day' | 'vibe' | 'weather' | 'context';
  description?: string;
}

export interface PulseFilterContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'lateNight';
  dayType: 'weekday' | 'weekend' | 'sunday';
  weather: 'good' | 'bad' | 'neutral';
  temperature: number;
  precipitationChance: number;
  userVibe?: string;
  hasFriendsActive: boolean;
  hasActiveFloqs: boolean;
  hasMajorEvents: boolean;
}

// Weather threshold constants
export const GOOD_WEATHER = {
  minTemp: 65, // °F
  maxPrecipitation: 30 // %
};

// Filter labels - centralized for easy updates
const LABELS = {
  // Core Persistent Filters
  distance: 'Distance',
  energy_low: 'Low energy',
  energy_medium: 'Medium energy', 
  energy_high: 'High energy',
  indoor: 'Indoor',
  outdoor: 'Outdoor',
  rooftop: 'Rooftop / Patio',
  waterfront: 'Waterfront',
  vibe_social: 'Social vibes',
  vibe_chill: 'Chill vibes',
  vibe_romantic: 'Romantic',
  vibe_family: 'Family-friendly',
  my_floqs: 'My floqs',
  public_floqs: 'Public floqs',
  smart_ai: 'Smart (AI-curated)',

  // Time-Based Dynamic Filters
  coffee_spots: 'Coffee spots',
  brunch: 'Brunch',
  quiet_work: 'Quiet work-friendly',
  morning_classes: 'Morning classes / wellness',
  lunch_specials: 'Lunch specials',
  outdoor_activities: 'Outdoor activities',
  day_parties: 'Day parties',
  popup_markets: 'Pop-up markets',
  dinner_spots: 'Dinner spots',
  live_music: 'Live music',
  happy_hour: 'Happy hour',
  sunset_views: 'Sunset views',
  bars_clubs: 'Bars & clubs',
  afterhours_food: 'After-hours food',
  karaoke: 'Karaoke',
  late_lounges: 'Late-night lounges',

  // Day-of-Week Conditional
  postwork_spots: 'Post-work spots',
  networking_events: 'Networking events',
  trivia_openmic: 'Open mic / trivia',
  study_cowork: 'Study / cowork spaces',
  festivals_markets: 'Festivals / markets',
  sports_watch: 'Sports watch spots',
  sunday_funday: 'Sunday Funday',
  chill_recovery: 'Chill recovery spots',
  jazz_acoustic: 'Jazz / acoustic nights',

  // Vibe-Responsive Filters
  dance_floors: 'Dance floors',
  live_djs: 'Live DJs',
  packed_venues: 'Packed venues',
  festivals_nearby: 'Festivals nearby',
  low_volume_lounges: 'Low-volume lounges',
  outdoor_patios: 'Outdoor patios',
  quiet_bars: 'Quiet bars',
  parks_nature: 'Parks / nature spots',
  date_night_spots: 'Date night spots',
  wine_bars: 'Wine bars',
  scenic_overlooks: 'Scenic overlooks',
  intimate_music: 'Intimate live music',
  group_friendly: 'Group-friendly venues',
  games_interactive: 'Games / interactive spaces',
  communal_seating: 'Communal seating',
  open_events: 'Open events',

  // Weather Special Filters
  outdoor_dining: 'Outdoor dining',
  rooftop_bars: 'Rooftop bars',
  beach_spots: 'Beach spots',
  openair_events: 'Open-air events',
  cozy_lounges: 'Cozy indoor lounges',
  indoor_entertainment: 'Live entertainment indoors',
  board_game_cafes: 'Board game cafes',
  movie_nights: 'Movie nights',

  // Smart Context Filters
  friends_now: 'Spots where your friends are now',
  trending_floqs: 'Venues trending in your floqs',
  pattern_match: 'Places like where you went last Friday',
  new_venues: 'New since your last visit',
  high_match: 'High match to your current vibe & weather'
};

export const usePulseFilters = () => {
  const { coords } = useGeo();
  const { data: weatherData } = useWeather();
  const { user } = useAuth();
  const { data: myFloqs = [] } = useMyActiveFloqs();

  // Compute filter context
  const context: PulseFilterContext = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Time of day logic
    let timeOfDay: PulseFilterContext['timeOfDay'];
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'lateNight';

    // Day type logic
    let dayType: PulseFilterContext['dayType'];
    if (day === 0) dayType = 'sunday';
    else if (day >= 1 && day <= 5) dayType = 'weekday';
    else dayType = 'weekend';

    // Weather assessment
    const temp = (weatherData as any)?.temperatureF || 70;
    const precipitation = (weatherData as any)?.precipitationChance || 0;
    let weather: PulseFilterContext['weather'];
    if (temp >= GOOD_WEATHER.minTemp && precipitation <= GOOD_WEATHER.maxPrecipitation) {
      weather = 'good';
    } else if (temp <= 50 || precipitation >= 60) {
      weather = 'bad';
    } else {
      weather = 'neutral';
    }

    return {
      timeOfDay,
      dayType,
      weather,
      temperature: temp,
      precipitationChance: precipitation,
      hasFriendsActive: false, // TODO: Connect to friends activity
      hasActiveFloqs: myFloqs.length > 0,
      hasMajorEvents: false // TODO: Connect to city events API
    };
  }, [weatherData, myFloqs]);

  // Generate available filters based on context
  const availableFilters: PulseFilterOption[] = useMemo(() => {
    const filters: PulseFilterOption[] = [];

    // 1. Core Persistent Filters (always available)
    filters.push(
      { key: 'distance', label: LABELS.distance, priority: 1, category: 'core' },
      { key: 'energy_low', label: LABELS.energy_low, priority: 3, category: 'core' },
      { key: 'energy_medium', label: LABELS.energy_medium, priority: 3, category: 'core' },
      { key: 'energy_high', label: LABELS.energy_high, priority: 3, category: 'core' },
      { key: 'indoor', label: LABELS.indoor, priority: 3, category: 'core' },
      { key: 'outdoor', label: LABELS.outdoor, priority: 3, category: 'core' },
      { key: 'rooftop', label: LABELS.rooftop, priority: 2, category: 'core' },
      { key: 'waterfront', label: LABELS.waterfront, priority: 2, category: 'core' },
      { key: 'vibe_social', label: LABELS.vibe_social, priority: 2, category: 'core' },
      { key: 'vibe_chill', label: LABELS.vibe_chill, priority: 2, category: 'core' },
      { key: 'vibe_romantic', label: LABELS.vibe_romantic, priority: 3, category: 'core' },
      { key: 'vibe_family', label: LABELS.vibe_family, priority: 3, category: 'core' },
      { key: 'my_floqs', label: LABELS.my_floqs, priority: context.hasActiveFloqs ? 1 : 3, category: 'core' },
      { key: 'public_floqs', label: LABELS.public_floqs, priority: 2, category: 'core' },
      { key: 'smart_ai', label: LABELS.smart_ai, priority: 2, category: 'core' }
    );

    // 2. Time-Based Dynamic Filters
    switch (context.timeOfDay) {
      case 'morning':
        filters.push(
          { key: 'coffee_spots', label: LABELS.coffee_spots, priority: 1, category: 'time' },
          { key: 'brunch', label: LABELS.brunch, priority: context.dayType === 'weekend' ? 1 : 2, category: 'time' },
          { key: 'quiet_work', label: LABELS.quiet_work, priority: 2, category: 'time' },
          { key: 'morning_classes', label: LABELS.morning_classes, priority: 3, category: 'time' }
        );
        break;
      case 'afternoon':
        filters.push(
          { key: 'lunch_specials', label: LABELS.lunch_specials, priority: 1, category: 'time' }
        );
        if (context.weather === 'good') {
          filters.push({ key: 'outdoor_activities', label: LABELS.outdoor_activities, priority: 2, category: 'time' });
        }
        if (context.dayType === 'weekend') {
          filters.push(
            { key: 'day_parties', label: LABELS.day_parties, priority: 2, category: 'time' },
            { key: 'popup_markets', label: LABELS.popup_markets, priority: 3, category: 'time' }
          );
        }
        break;
      case 'evening':
        filters.push(
          { key: 'dinner_spots', label: LABELS.dinner_spots, priority: 1, category: 'time' },
          { key: 'live_music', label: LABELS.live_music, priority: context.dayType === 'weekend' ? 1 : 2, category: 'time' },
          { key: 'happy_hour', label: LABELS.happy_hour, priority: 2, category: 'time' }
        );
        if (context.weather === 'good') {
          filters.push({ key: 'sunset_views', label: LABELS.sunset_views, priority: 2, category: 'time' });
        }
        break;
      case 'lateNight':
        filters.push(
          { key: 'bars_clubs', label: LABELS.bars_clubs, priority: 1, category: 'time' },
          { key: 'afterhours_food', label: LABELS.afterhours_food, priority: 2, category: 'time' },
          { key: 'karaoke', label: LABELS.karaoke, priority: 3, category: 'time' },
          { key: 'late_lounges', label: LABELS.late_lounges, priority: 3, category: 'time' }
        );
        break;
    }

    // 3. Day-of-Week Conditional Filters
    if (context.dayType === 'weekday') {
      filters.push(
        { key: 'postwork_spots', label: LABELS.postwork_spots, priority: 2, category: 'day' },
        { key: 'networking_events', label: LABELS.networking_events, priority: 3, category: 'day' },
        { key: 'trivia_openmic', label: LABELS.trivia_openmic, priority: 3, category: 'day' },
        { key: 'study_cowork', label: LABELS.study_cowork, priority: 3, category: 'day' }
      );
    } else if (context.dayType === 'weekend') {
      filters.push(
        { key: 'day_parties', label: LABELS.day_parties, priority: 2, category: 'day' },
        { key: 'festivals_markets', label: LABELS.festivals_markets, priority: 2, category: 'day' },
        { key: 'brunch', label: LABELS.brunch, priority: 1, category: 'day' },
        { key: 'sports_watch', label: LABELS.sports_watch, priority: 3, category: 'day' }
      );
    } else if (context.dayType === 'sunday') {
      filters.push(
        { key: 'sunday_funday', label: LABELS.sunday_funday, priority: 1, category: 'day' },
        { key: 'chill_recovery', label: LABELS.chill_recovery, priority: 2, category: 'day' },
        { key: 'jazz_acoustic', label: LABELS.jazz_acoustic, priority: 3, category: 'day' }
      );
    }

    // 4. Weather-Responsive Filters
    if (context.weather === 'good') {
      filters.push(
        { key: 'outdoor_dining', label: LABELS.outdoor_dining, priority: 1, category: 'weather' },
        { key: 'rooftop_bars', label: LABELS.rooftop_bars, priority: 2, category: 'weather' },
        { key: 'beach_spots', label: LABELS.beach_spots, priority: 2, category: 'weather' },
        { key: 'openair_events', label: LABELS.openair_events, priority: 3, category: 'weather' }
      );
    } else if (context.weather === 'bad') {
      filters.push(
        { key: 'cozy_lounges', label: LABELS.cozy_lounges, priority: 1, category: 'weather' },
        { key: 'indoor_entertainment', label: LABELS.indoor_entertainment, priority: 2, category: 'weather' },
        { key: 'board_game_cafes', label: LABELS.board_game_cafes, priority: 3, category: 'weather' },
        { key: 'movie_nights', label: LABELS.movie_nights, priority: 3, category: 'weather' }
      );
    }

    // 5. Smart Context Filters
    if (context.hasFriendsActive) {
      filters.push({ key: 'friends_now', label: LABELS.friends_now, priority: 1, category: 'context' });
    }
    if (context.hasActiveFloqs) {
      filters.push({ key: 'trending_floqs', label: LABELS.trending_floqs, priority: 2, category: 'context' });
    }
    if (context.dayType === 'weekend' && (context.timeOfDay === 'evening' || context.timeOfDay === 'lateNight')) {
      filters.push({ key: 'pattern_match', label: LABELS.pattern_match, priority: 2, category: 'context' });
    }
    filters.push(
      { key: 'new_venues', label: LABELS.new_venues, priority: 3, category: 'context' },
      { key: 'high_match', label: LABELS.high_match, priority: 2, category: 'context' }
    );

    // Remove duplicates and sort by priority then category
    const uniqueFilters = filters.filter((filter, index, array) => 
      array.findIndex(f => f.key === filter.key) === index
    );

    return uniqueFilters.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const categoryOrder = ['core', 'time', 'day', 'weather', 'context'];
      return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    });
  }, [context]);

  return {
    availableFilters,
    context,
    LABELS
  };
};