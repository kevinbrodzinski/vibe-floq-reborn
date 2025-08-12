import React from 'react';
import { Sun, Cloud, CloudRain, Snowflake, Wind, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WeatherData {
  tempF: number;
  condition: 'sunny' | 'cloudy' | 'rain' | 'snow' | 'wind' | 'fog' | 'mixed';
  precipChancePct: number;
  isGoodWeather?: boolean;
  fetchedAt?: string;
}

interface PulseWeatherCardProps {
  weather: WeatherData;
  selectedTime?: 'now' | 'tonight' | 'tomorrow' | 'weekend' | 'custom';
  onOutdoorCta?: () => void;
  onIndoorCta?: () => void;
  className?: string;
}

const getWeatherIcon = (condition: WeatherData['condition'], size = 'w-5 h-5') => {
  switch (condition) {
    case 'sunny':
      return <Sun className={cn(size, 'text-yellow-400')} />;
    case 'cloudy':
      return <Cloud className={cn(size, 'text-gray-400')} />;
    case 'rain':
      return <CloudRain className={cn(size, 'text-blue-400')} />;
    case 'snow':
      return <Snowflake className={cn(size, 'text-blue-200')} />;
    case 'wind':
      return <Wind className={cn(size, 'text-gray-500')} />;
    case 'fog':
      return <Eye className={cn(size, 'text-gray-300')} />;
    default:
      return <Cloud className={cn(size, 'text-gray-400')} />;
  }
};

const getConditionLabel = (condition: WeatherData['condition']) => {
  return condition.charAt(0).toUpperCase() + condition.slice(1);
};

const getTimeLabel = (selectedTime?: PulseWeatherCardProps['selectedTime']) => {
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

const getFreshness = (fetchedAt?: string) => {
  if (!fetchedAt) return null;
  const minutes = Math.max(0, Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60000));
  return minutes;
};

export const PulseWeatherCard: React.FC<PulseWeatherCardProps> = ({
  weather,
  selectedTime,
  onOutdoorCta,
  onIndoorCta,
  className
}) => {
  const { tempF, condition, precipChancePct, isGoodWeather } = weather;
  const timeLabel = getTimeLabel(selectedTime);
  const freshness = getFreshness(weather.fetchedAt);
  
  const headline = isGoodWeather
    ? 'Perfect weather for outdoor activities!'
    : condition === 'rain' || condition === 'snow'
    ? 'Cozy up somewhere indoors'
    : 'Great for indoor hangouts';

  const ctaLabel = isGoodWeather ? 'Show outdoor venues' : 'Find cozy spots';
  const handleCta = isGoodWeather ? onOutdoorCta : onIndoorCta;

  return (
    <div className={cn(
      'rounded-2xl p-4 bg-gradient-to-r from-slate-800/80 to-slate-700/80 border border-white/10 backdrop-blur-sm',
      className
    )}>
      {/* Header with icon, temp, and time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {getWeatherIcon(condition, 'w-6 h-6')}
          <div>
            <div className="text-lg font-semibold text-white">
              {tempF}°F • {getConditionLabel(condition)}
            </div>
            <div className="text-sm text-white/70">
              {timeLabel}
            </div>
          </div>
        </div>
        
        {/* Freshness indicator */}
        {freshness !== null && (
          <div className="text-xs text-white/50">
            Updated {freshness}m ago
          </div>
        )}
      </div>

      {/* Weather details */}
      <div className="mb-4">
        <p className="text-sm text-white/80 mb-1">
          {headline}
        </p>
        {precipChancePct > 0 && (
          <p className="text-xs text-white/60">
            {precipChancePct}% chance of precipitation
          </p>
        )}
      </div>

      {/* CTA Button */}
      {handleCta && (
        <button
          onClick={handleCta}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl font-medium transition-all duration-200',
            'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30',
            'focus:outline-none focus:ring-2 focus:ring-white/20'
          )}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
};