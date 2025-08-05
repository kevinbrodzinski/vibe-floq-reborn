export interface WeatherSnapshot {
  condition:   "clear" | "clouds" | "rain" | "snow" | "drizzle" | "thunderstorm" | "mist" | "fog" | string;
  temperatureF: number;
  feelsLikeF:   number;
  humidity:     number;
  windMph:      number;
  icon:         string;         // "01d", "04n"… use OpenWeather icon set
  created_at:   string;         // ISO-8601
} 