import React from 'react';
import { MapPin, Droplets, Wind, Sun, Cloud } from 'lucide-react';
import { TimeOption } from './DateTimeSelector';
import { GOOD_WEATHER } from '@/hooks/usePulseFilters';

interface WeatherData {
  condition: string;
  temperatureF: number;
  feelsLikeF?: number;
  humidity?: number;
  windMph?: number;
  precipitationChance?: number;
  icon?: string;
  updatedAt?: Date;
}

interface PulseLocationWeatherBarProps {
  location?: {
    city?: string;
    neighborhood?: string;
  };
  weather?: WeatherData;
  selectedTime: TimeOption;
  isLoading?: boolean;
  className?: string;
}

const getWeatherIcon = (condition: string) => {
  // Using emoji for simplicity - could be replaced with Lucide icons
  switch (condition.toLowerCase()) {
    case 'clear':
    case 'sunny':
      return '☀️';
    case 'clouds':
    case 'cloudy':
    case 'overcast':
      return '☁️';
    case 'rain':
    case 'drizzle':
      return '🌧️';
    case 'snow':
      return '❄️';
    case 'thunderstorm':
      return '⛈️';
    case 'mist':
    case 'fog':
      return '🌫️';
    default:
      return '☁️';
  }
};

const getWeatherDescription = (condition: string) => {
  switch (condition.toLowerCase()) {
    case 'clear':
    case 'sunny':
      return 'sunny';
    case 'clouds':
    case 'cloudy':
      return 'cloudy';
    case 'overcast':
      return 'overcast';
    case 'rain':
      return 'rainy';
    case 'drizzle':
      return 'drizzling';
    case 'snow':
      return 'snowy';
    case 'thunderstorm':
      return 'stormy';
    case 'mist':
    case 'fog':
      return 'misty';
    default:
      return condition.toLowerCase();
  }
};

const getTimeContextLabel = (selectedTime: TimeOption) => {
  switch (selectedTime) {
    case 'now':
      return 'Current';
    case 'tonight':
      return 'Tonight';
    case 'tomorrow':
      return 'Tomorrow';
    case 'weekend':
      return 'Weekend';
    case 'custom':
      return 'Selected';
    default:
      return 'Current';
  }
};

export const PulseLocationWeatherBar: React.FC<PulseLocationWeatherBarProps> = ({
  location,
  weather,
  selectedTime,
  isLoading = false,
  className = ''
}) => {
  const locationText = location?.neighborhood 
    ? `${location.neighborhood}, ${location.city || 'Unknown'}`
    : location?.city || 'Current location';

  if (isLoading) {
    return (
      <div className={`px-6 mb-4 ${className}`}>
        <div className="flex items-center justify-between bg-white/10 backdrop-blur-xl rounded-2xl p-3 border border-white/20">
          <div className="flex items-center gap-2 animate-pulse">
            <div className="w-4 h-4 bg-white/20 rounded"></div>
            <div className="w-32 h-4 bg-white/20 rounded"></div>
          </div>
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-16 h-4 bg-white/20 rounded"></div>
            <div className="w-20 h-4 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`px-6 mb-4 ${className}`}>
      <div className="flex items-center justify-between bg-white/10 backdrop-blur-xl rounded-2xl p-3 border border-white/20">
        {/* Location (Left Side) */}
        <div className="flex items-center gap-2 text-white/90 flex-shrink min-w-0">
          <MapPin className="w-4 h-4 text-white/70 flex-shrink-0" />
          <span className="text-sm font-medium truncate">
            {locationText}
          </span>
        </div>

        {/* Weather Stats (Right Side) */}
        <div className="flex items-center gap-2 sm:gap-3 text-white/90 flex-shrink-0">
          {weather ? (
            <>
              {/* Temperature and Condition */}
              <div className="flex items-center gap-1">
                <span className="text-base sm:text-lg">{getWeatherIcon(weather.condition)}</span>
                <span className="text-sm font-medium">
                  {Math.round(weather.temperatureF)}°
                </span>
                <span className="text-xs text-white/70 capitalize hidden sm:inline">
                  {getWeatherDescription(weather.condition)}
                </span>
              </div>

              {/* Wind Speed (if available) */}
              {weather.windMph && weather.windMph > 0 && (
                <div className="flex items-center gap-1 text-xs text-white/70">
                  <Wind className="w-3 h-3" />
                  <span>{Math.round(weather.windMph)} mph</span>
                </div>
              )}

              {/* Precipitation Chance (if > 0%) */}
              {weather.precipitationChance !== undefined && weather.precipitationChance > 0 && (
                <div className="flex items-center gap-1 text-xs text-white/70">
                  <Droplets className="w-3 h-3" />
                  <span>{weather.precipitationChance}%</span>
                </div>
              )}

              {/* Weather Quality Indicator */}
              {(() => {
                const temp = weather.temperatureF;
                const precipitation = weather.precipitationChance || 0;
                const isGoodWeather = temp >= GOOD_WEATHER.minTemp && precipitation <= GOOD_WEATHER.maxPrecipitation;
                
                                 if (isGoodWeather) {
                   return (
                     <div className="flex items-center gap-1 text-xs text-green-400">
                       <Sun className="w-3 h-3" />
                       <span className="hidden sm:inline">Great for outdoor</span>
                       <span className="sm:hidden">Outdoor</span>
                     </div>
                   );
                 } else if (precipitation > 50 || temp < 45) {
                   return (
                     <div className="flex items-center gap-1 text-xs text-blue-400">
                       <Cloud className="w-3 h-3" />
                       <span className="hidden sm:inline">Indoor weather</span>
                       <span className="sm:hidden">Indoor</span>
                     </div>
                   );
                 }
                return null;
              })()}
            </>
          ) : (
            <span className="text-xs text-white/50">
              {getTimeContextLabel(selectedTime)} weather
            </span>
          )}
        </div>
      </div>
    </div>
  );
};