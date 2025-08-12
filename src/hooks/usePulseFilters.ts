import { useMemo } from 'react';

//
// Types
//
export type Vibe =
  | 'high_energy'
  | 'social'
  | 'chill'
  | 'romantic'
  | 'family';

export type WeatherBasic = {
  // normalized inputs from your weather hook
  tempF: number;              // integer
  condition: 'sunny' | 'cloudy' | 'rain' | 'snow' | 'wind' | 'fog' | 'mixed';
  precipChancePct: number;    // 0-100
};

export type TimeCtx = {
  // selected time window reference (start of window)
  localDate: Date;
};

export type CityEventsCtx = {
  hasMajorConcert: boolean;
  hasMajorSports: boolean;
  hasFestival: boolean;
};

export type FriendsCtx = {
  recentCheckinCount: number;     // last ~2h
  activeFloqsCount: number;       // user is member
  trendingFloqsNearbyCount: number;
};

export type PulseFilterKey =
  // Core
  | 'distance'
  | 'energy'
  | 'venue_type'
  | 'vibe_type'
  | 'floqs'
  | 'smart'
  // Time‑based
  | 'coffee_spots'
  | 'brunch'
  | 'quiet_work'
  | 'morning_classes'
  | 'lunch_specials'
  | 'outdoor_activities'
  | 'day_parties'
  | 'pop_up_markets'
  | 'dinner_spots'
  | 'live_music'
  | 'happy_hour'
  | 'sunset_views'
  | 'bars_clubs'
  | 'after_hours_food'
  | 'karaoke'
  | 'late_night_lounges'
  // DOW
  | 'post_work'
  | 'networking'
  | 'open_mic_trivia'
  | 'cowork_spaces'
  | 'festivals_markets'
  | 'brunch_all_day'
  | 'sports_watch'
  | 'sunday_funday'
  | 'sunday_chill'
  | 'jazz_acoustic'
  // Vibe‑responsive
  | 'dance_floors'
  | 'live_djs'
  | 'packed_venues'
  | 'festivals_nearby'
  | 'low_volume_lounges'
  | 'outdoor_patios'
  | 'quiet_bars'
  | 'parks_nature'
  | 'date_night'
  | 'wine_bars'
  | 'scenic_overlooks'
  | 'intimate_live'
  | 'group_friendly'
  | 'games_interactive'
  | 'communal_seating'
  | 'open_events'
  // Weather special
  | 'outdoor_dining'
  | 'rooftop_bars'
  | 'beach_spots'
  | 'open_air_events'
  | 'cozy_lounges'
  | 'indoor_entertainment'
  | 'board_game_cafes'
  | 'movie_nights'
  // Smart
  | 'friends_now'
  | 'trending_in_floqs'
  | 'like_last_friday'
  | 'new_since_last'
  | 'high_match_vibe_weather';

export type PulseFilterChip = {
  key: PulseFilterKey;
  label: string;
  // optional short hint for tooltips/aria
  hint?: string;
  // whether the pill should be visually emphasized
  priority?: 1 | 2 | 3;
};

export type UsePulseFiltersParams = {
  time: TimeCtx;
  vibe: Vibe;
  weather: WeatherBasic;
  city: CityEventsCtx;
  friends: FriendsCtx;
  // day/time helpers you may already have
  now?: Date; // for testing; defaults to new Date()
};

//
// Constants / helpers
//
export const GOOD_WEATHER = (w: WeatherBasic) =>
  w.tempF >= 65 && w.precipChancePct <= 30 && w.condition !== 'rain' && w.condition !== 'snow';

const BAD_WEATHER = (w: WeatherBasic) =>
  w.tempF <= 50 || w.precipChancePct >= 30 || w.condition === 'rain' || w.condition === 'snow';

function hour(d: Date) { return d.getHours(); }
function isWeekend(d: Date) {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  return day === 5 || day === 6 || day === 0; // Fri/Sat/Sun
}
function isSunday(d: Date) { return d.getDay() === 0; }

function timeBucket(d: Date): 'morning'|'afternoon'|'evening'|'late_night' {
  const h = hour(d);
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'late_night'; // 21:00 – 04:59
}

//
// Label map (UI copy is centralized here for easy edits)
//
const LABELS: Record<PulseFilterKey, string> = {
  // Core
  distance: 'Distance',
  energy: 'Energy',
  venue_type: 'Venue type',
  vibe_type: 'Vibe',
  floqs: 'Floqs',
  smart: 'Smart',
  // Time‑based
  coffee_spots: 'Coffee spots',
  brunch: 'Brunch',
  quiet_work: 'Quiet work‑friendly',
  morning_classes: 'Morning classes',
  lunch_specials: 'Lunch specials',
  outdoor_activities: 'Outdoor activities',
  day_parties: 'Day parties',
  pop_up_markets: 'Pop‑up markets',
  dinner_spots: 'Dinner spots',
  live_music: 'Live music',
  happy_hour: 'Happy hour',
  sunset_views: 'Sunset views',
  bars_clubs: 'Bars & clubs',
  after_hours_food: 'After‑hours food',
  karaoke: 'Karaoke',
  late_night_lounges: 'Late‑night lounges',
  // DOW
  post_work: 'Post‑work spots',
  networking: 'Networking',
  open_mic_trivia: 'Open mic / trivia',
  cowork_spaces: 'Study / cowork',
  festivals_markets: 'Festivals / markets',
  brunch_all_day: 'Brunch all day',
  sports_watch: 'Sports watch spots',
  sunday_funday: 'Sunday Funday',
  sunday_chill: 'Chill recovery',
  jazz_acoustic: 'Jazz / acoustic',
  // Vibe
  dance_floors: 'Dance floors',
  live_djs: 'Live DJs',
  packed_venues: 'Packed venues',
  festivals_nearby: 'Festivals nearby',
  low_volume_lounges: 'Low‑volume lounges',
  outdoor_patios: 'Outdoor patios',
  quiet_bars: 'Quiet bars',
  parks_nature: 'Parks / nature',
  date_night: 'Date night',
  wine_bars: 'Wine bars',
  scenic_overlooks: 'Scenic overlooks',
  intimate_live: 'Intimate live music',
  group_friendly: 'Group‑friendly',
  games_interactive: 'Games / interactive',
  communal_seating: 'Communal seating',
  open_events: 'Open events',
  // Weather
  outdoor_dining: 'Outdoor dining',
  rooftop_bars: 'Rooftop bars',
  beach_spots: 'Beach spots',
  open_air_events: 'Open‑air events',
  cozy_lounges: 'Cozy indoor lounges',
  indoor_entertainment: 'Live entertainment indoors',
  board_game_cafes: 'Board game cafes',
  movie_nights: 'Movie nights',
  // Smart
  friends_now: 'Friends now',
  trending_in_floqs: 'Trending in your floqs',
  like_last_friday: 'Like last Friday',
  new_since_last: 'New since last visit',
  high_match_vibe_weather: 'High match: vibe × weather',
};

//
// Rule engine
//
function coreFilters(): PulseFilterChip[] {
  return [
    { key: 'distance', label: LABELS.distance, priority: 1 },
    { key: 'energy', label: LABELS.energy },
    { key: 'venue_type', label: LABELS.venue_type },
    { key: 'vibe_type', label: LABELS.vibe_type },
    { key: 'floqs', label: LABELS.floqs },
    { key: 'smart', label: LABELS.smart, priority: 2 },
  ];
}

function timeFilters(d: Date, w: WeatherBasic): PulseFilterChip[] {
  const tb = timeBucket(d);
  const wknd = isWeekend(d);
  const arr: PulseFilterChip[] = [];

  if (tb === 'morning') {
    arr.push(
      { key: 'coffee_spots', label: LABELS.coffee_spots },
      { key: 'brunch', label: LABELS.brunch, priority: wknd ? 2 : undefined },
      { key: 'quiet_work', label: LABELS.quiet_work },
      { key: 'morning_classes', label: LABELS.morning_classes },
    );
  }
  if (tb === 'afternoon') {
    arr.push(
      { key: 'lunch_specials', label: LABELS.lunch_specials },
      ...(GOOD_WEATHER(w) ? [{ key: 'outdoor_activities', label: LABELS.outdoor_activities }] : []),
      ...(wknd ? [{ key: 'day_parties', label: LABELS.day_parties, priority: 2 }] : []),
      ...(wknd ? [{ key: 'pop_up_markets', label: LABELS.pop_up_markets }] : []),
    );
  }
  if (tb === 'evening') {
    arr.push(
      { key: 'dinner_spots', label: LABELS.dinner_spots },
      { key: 'live_music', label: LABELS.live_music, priority: isWeekend(d) ? 2 : undefined },
      // Happy hour only relevant if user selected a near-future time; keep anyway for 4–7 PM guidance
      { key: 'happy_hour', label: LABELS.happy_hour },
      ...(GOOD_WEATHER(w) ? [{ key: 'sunset_views', label: LABELS.sunset_views }] : []),
    );
  }
  if (tb === 'late_night') {
    arr.push(
      { key: 'bars_clubs', label: LABELS.bars_clubs, priority: 2 },
      { key: 'after_hours_food', label: LABELS.after_hours_food },
      { key: 'karaoke', label: LABELS.karaoke },
      { key: 'late_night_lounges', label: LABELS.late_night_lounges },
    );
  }

  return arr;
}

function dayOfWeekFilters(d: Date, city: CityEventsCtx): PulseFilterChip[] {
  const weekday = !isWeekend(d);
  const sunday = isSunday(d);
  const arr: PulseFilterChip[] = [];

  if (weekday) {
    arr.push(
      ...(hour(d) >= 16 ? [{ key: 'post_work', label: LABELS.post_work }] : []),
      { key: 'networking', label: LABELS.networking },
      { key: 'open_mic_trivia', label: LABELS.open_mic_trivia },
      ...(hour(d) < 18 ? [{ key: 'cowork_spaces', label: LABELS.cowork_spaces }] : []),
    );
  } else {
    arr.push(
      { key: 'festivals_markets', label: LABELS.festivals_markets, priority: city.hasFestival ? 2 : undefined },
      { key: 'brunch_all_day', label: LABELS.brunch_all_day },
      { key: 'sports_watch', label: LABELS.sports_watch, priority: city.hasMajorSports ? 2 : undefined },
    );
  }

  if (sunday) {
    arr.push(
      { key: 'sunday_funday', label: LABELS.sunday_funday },
      { key: 'sunday_chill', label: LABELS.sunday_chill },
      { key: 'jazz_acoustic', label: LABELS.jazz_acoustic },
    );
  }

  // Event-heavy extras
  if (city.hasMajorConcert) {
    arr.push({ key: 'live_music', label: LABELS.live_music, priority: 2 });
  }

  return arr;
}

function vibeFilters(vibe: Vibe, w: WeatherBasic): PulseFilterChip[] {
  switch (vibe) {
    case 'high_energy':
      return [
        { key: 'dance_floors', label: LABELS.dance_floors, priority: 2 },
        { key: 'live_djs', label: LABELS.live_djs },
        { key: 'packed_venues', label: LABELS.packed_venues },
        { key: 'festivals_nearby', label: LABELS.festivals_nearby },
      ];
    case 'chill':
      return [
        { key: 'low_volume_lounges', label: LABELS.low_volume_lounges },
        ...(GOOD_WEATHER(w) ? [{ key: 'outdoor_patios', label: LABELS.outdoor_patios }] : []),
        { key: 'quiet_bars', label: LABELS.quiet_bars },
        ...(GOOD_WEATHER(w) ? [{ key: 'parks_nature', label: LABELS.parks_nature }] : []),
      ];
    case 'romantic':
      return [
        { key: 'date_night', label: LABELS.date_night },
        { key: 'wine_bars', label: LABELS.wine_bars },
        ...(GOOD_WEATHER(w) ? [{ key: 'scenic_overlooks', label: LABELS.scenic_overlooks }] : []),
        { key: 'intimate_live', label: LABELS.intimate_live },
      ];
    case 'social':
      return [
        { key: 'group_friendly', label: LABELS.group_friendly, priority: 2 },
        { key: 'games_interactive', label: LABELS.games_interactive },
        { key: 'communal_seating', label: LABELS.communal_seating },
        { key: 'open_events', label: LABELS.open_events },
      ];
    case 'family':
      return [
        { key: 'parks_nature', label: LABELS.parks_nature },
        { key: 'outdoor_activities', label: LABELS.outdoor_activities },
        { key: 'quiet_bars', label: LABELS.quiet_bars, hint: 'kid‑friendly mocktails / games' },
      ];
    default:
      return [];
  }
}

function weatherSpecials(w: WeatherBasic): PulseFilterChip[] {
  if (GOOD_WEATHER(w)) {
    return [
      { key: 'outdoor_dining', label: LABELS.outdoor_dining, priority: 2 },
      { key: 'rooftop_bars', label: LABELS.rooftop_bars },
      { key: 'beach_spots', label: LABELS.beach_spots },
      { key: 'open_air_events', label: LABELS.open_air_events },
    ];
  }
  if (BAD_WEATHER(w)) {
    return [
      { key: 'cozy_lounges', label: LABELS.cozy_lounges, priority: 2 },
      { key: 'indoor_entertainment', label: LABELS.indoor_entertainment },
      { key: 'board_game_cafes', label: LABELS.board_game_cafes },
      { key: 'movie_nights', label: LABELS.movie_nights },
    ];
  }
  return [];
}

function smartFilters(friends: FriendsCtx, d: Date, vibe: Vibe, w: WeatherBasic): PulseFilterChip[] {
  const arr: PulseFilterChip[] = [
    { key: 'high_match_vibe_weather', label: LABELS.high_match_vibe_weather, priority: 2 },
    { key: 'new_since_last', label: LABELS.new_since_last },
  ];
  if (friends.recentCheckinCount > 0) {
    arr.unshift({ key: 'friends_now', label: LABELS.friends_now, priority: 1 });
  }
  if (friends.trendingFloqsNearbyCount > 0 || friends.activeFloqsCount > 0) {
    arr.push({ key: 'trending_in_floqs', label: LABELS.trending_in_floqs });
  }
  // Show "like_last_friday" on Fri/Sat nights to seed intent
  const tb = timeBucket(d);
  if ((d.getDay() === 5 || d.getDay() === 6) && (tb === 'evening' || tb === 'late_night')) {
    arr.push({ key: 'like_last_friday', label: LABELS.like_last_friday });
  }
  return arr;
}

function dedupeByKey(items: PulseFilterChip[]): PulseFilterChip[] {
  const seen = new Set<PulseFilterKey>();
  const out: PulseFilterChip[] = [];
  for (const it of items) {
    if (!seen.has(it.key)) {
      seen.add(it.key);
      out.push(it);
    }
  }
  return out;
}

//
// Hook
//
export function usePulseFilters(params: UsePulseFiltersParams) {
  const { time, weather, vibe, city, friends } = params;
  const ref = params.now ?? new Date();

  return useMemo(() => {
    const d = time.localDate ?? ref;

    const list = [
      ...coreFilters(),
      ...timeFilters(d, weather),
      ...dayOfWeekFilters(d, city),
      ...vibeFilters(vibe, weather),
      ...weatherSpecials(weather),
      ...smartFilters(friends, d, vibe, weather),
    ];

    // Sort: priority(1 highest) → priority(2) → priority(3) → others; stable within groups
    const withDefaultPriority = list.map(chip => ({ ...chip, priority: chip.priority ?? 3 as 1|2|3 }));
    const deduped = dedupeByKey(withDefaultPriority);
    deduped.sort((a, b) => (a.priority! - b.priority!));

    return deduped;
  }, [time.localDate?.getTime(), weather.tempF, weather.condition, weather.precipChancePct, vibe, city.hasFestival, city.hasMajorConcert, city.hasMajorSports, friends.recentCheckinCount, friends.activeFloqsCount, friends.trendingFloqsNearbyCount]);
}