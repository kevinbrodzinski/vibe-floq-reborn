import React, { useMemo } from 'react';
import { Cloud, CloudRain, Sun, CloudSnow, Zap, Eye, Droplets, Wind } from 'lucide-react';
import { motion } from 'framer-motion';
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

interface PulseWeatherCardProps {
  weather?: WeatherData;
  selectedTime: TimeOption;
  isLoading?: boolean;
  onWeatherCTA?: (action: 'outdoor' | 'indoor') => void;
  className?: string;
}

const getWeatherIcon = (condition: string, size: 'sm' | 'md' | 'lg' = 'md') => {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6'
  }[size];

  switch (condition.toLowerCase()) {
    case 'clear':
    case 'sunny':
      return <Sun className={`${sizeClass} text-yellow-400`} />;
    case 'clouds':
    case 'cloudy':
    case 'overcast':
      return <Cloud className={`${sizeClass} text-gray-400`} />;
    case 'rain':
    case 'drizzle':
      return <CloudRain className={`${sizeClass} text-blue-400`} />;
    case 'snow':
      return <CloudSnow className={`${sizeClass} text-blue-200`} />;
    case 'thunderstorm':
      return <Zap className={`${sizeClass} text-purple-400`} />;
    default:
      return <Cloud className={`${sizeClass} text-gray-400`} />;
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
      return 'Right now';
    case 'tonight':
      return 'Tonight';
    case 'tomorrow':
      return 'Tomorrow';
    case 'weekend':
      return 'This weekend';
    case 'custom':
      return 'Selected time';
    default:
      return 'Current';
  }
};

const getFreshnessText = (updatedAt?: Date) => {
  if (!updatedAt) return 'Just updated';
  
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60));
  
  if (diffMinutes < 1) return 'Just updated';
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  return `Updated ${diffHours}h ago`;
};

export const PulseWeatherCard: React.FC<PulseWeatherCardProps> = ({
  weather,
  selectedTime,
  isLoading = false,
  onWeatherCTA,
  className = ''
}) => {
  const weatherAnalysis = useMemo(() => {
    if (!weather) return null;

    const temp = weather.temperatureF;
    const precipitation = weather.precipitationChance || 0;
    const isGoodWeather = temp >= GOOD_WEATHER.minTemp && precipitation <= GOOD_WEATHER.maxPrecipitation;
    
    return {
      isGoodWeather,
      recommendation: isGoodWeather 
        ? 'Perfect for outdoor activities!'
        : precipitation > 50 
          ? 'Better to stay indoors'
          : temp < 50 
            ? 'Bundle up if heading out'
            : 'Mild weather, indoor or outdoor works'
    };
  }, [weather]);

  const handleCTAClick = (action: 'outdoor' | 'indoor') => {
    onWeatherCTA?.(action);
  };

  if (isLoading) {
    return (
      <div className={`bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-5 bg-white/20 rounded"></div>
            <div className="w-32 h-4 bg-white/20 rounded"></div>
          </div>
          <div className="w-full h-6 bg-white/20 rounded mb-2"></div>
          <div className="w-24 h-3 bg-white/20 rounded"></div>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className={`bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 ${className}`}>
        <div className="flex items-center gap-3 text-white/70">
          <Eye className="w-5 h-5" />
          <span className="text-sm">Weather data unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className={`bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header with time context */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white/70 text-xs">
          <span>{getTimeContextLabel(selectedTime)}</span>
          <span>•</span>
          <span>{getFreshnessText(weather.updatedAt)}</span>
        </div>
      </div>

      {/* Main weather display */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-3">
          {getWeatherIcon(weather.condition, 'lg')}
          <div>
            <div className="text-2xl font-bold text-white">
              {Math.round(weather.temperatureF)}°
            </div>
            <div className="text-sm text-white/80">
              {getWeatherDescription(weather.condition)}
            </div>
          </div>
        </div>

        {/* Precipitation chance if applicable */}
        {weather.precipitationChance !== undefined && weather.precipitationChance > 0 && (
          <div className="flex items-center gap-1 text-white/70">
            <Droplets className="w-4 h-4" />
            <span className="text-sm">{weather.precipitationChance}%</span>
          </div>
        )}
      </div>

      {/* Weather summary line */}
      <div className="text-sm text-white/90 mb-4">
        <span className="font-medium">{Math.round(weather.temperatureF)}°</span>
        <span className="text-white/70 mx-2">|</span>
        <span>{getWeatherDescription(weather.condition)}</span>
        {weather.precipitationChance !== undefined && weather.precipitationChance > 0 && (
          <>
            <span className="text-white/70 mx-2">|</span>
            <span>{weather.precipitationChance}% chance of rain</span>
          </>
        )}
      </div>

      {/* Contextual CTA */}
      {weatherAnalysis && (
        <div className="space-y-2">
          <p className="text-xs text-white/70">
            {weatherAnalysis.recommendation}
          </p>
          
          <div className="flex gap-2">
            {weatherAnalysis.isGoodWeather ? (
              <button
                onClick={() => handleCTAClick('outdoor')}
                className="px-3 py-1.5 bg-green-500/20 text-green-200 rounded-lg text-xs font-medium hover:bg-green-500/30 transition-colors flex items-center gap-1.5"
              >
                <Sun className="w-3 h-3" />
                Show outdoor venues
              </button>
            ) : (
              <button
                onClick={() => handleCTAClick('indoor')}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-200 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-1.5"
              >
                <Cloud className="w-3 h-3" />
                Find cozy spots
              </button>
            )}
          </div>
        </div>
      )}

      {/* Additional weather details */}
      {(weather.feelsLikeF || weather.humidity || weather.windMph) && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10 text-xs text-white/60">
          {weather.feelsLikeF && (
            <span>Feels like {Math.round(weather.feelsLikeF)}°</span>
          )}
          {weather.humidity && (
            <span className="flex items-center gap-1">
              <Droplets className="w-3 h-3" />
              {weather.humidity}%
            </span>
          )}
          {weather.windMph && (
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3" />
              {Math.round(weather.windMph)} mph
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};