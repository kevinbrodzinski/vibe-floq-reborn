export interface WeatherSnapshot {
  condition:   "clear" | "clouds" | "rain" | "snow" | "drizzle" | "thunderstorm" | "mist" | "fog" | "rainy" | "foggy" | "windy" | string;
  temperatureF: number;
  feelsLikeF:   number;
  humidity:     number;
  windMph:      number;
  precipitationMm?: number;     // Added for Phase 4 weather modulation
  visibilityKm?: number;        // Added for Phase 4 weather modulation
  icon?:        string;         // "01d", "04n"… use OpenWeather icon set
  created_at?:  string;         // ISO-8601
  updated_at?:  string;         // ISO-8601
}