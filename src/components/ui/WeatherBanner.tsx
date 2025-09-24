import React from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Zap, Wind } from 'lucide-react';

interface WeatherBannerProps {
  temp: number;
  feels: number;
  humidity: number;
  wind: number;
  cond: string;
  icon: string;
  hint?: string;
}

const getWeatherIcon = (condition: string) => {
  switch (condition.toLowerCase()) {
    case 'clear':
      return <Sun className="w-5 h-5 text-yellow-500" />;
    case 'clouds':
      return <Cloud className="w-5 h-5 text-gray-400" />;
    case 'rain':
    case 'drizzle':
      return <CloudRain className="w-5 h-5 text-blue-400" />;
    case 'snow':
      return <CloudSnow className="w-5 h-5 text-blue-200" />;
    case 'thunderstorm':
      return <Zap className="w-5 h-5 text-yellow-400" />;
    default:
      return <Sun className="w-5 h-5 text-yellow-500" />;
  }
};

const getHint = (condition: string, temp: number): string => {
  if (condition === 'clear' && temp > 70) return 'Perfect weather for outdoor activities';
  if (condition === 'rain') return 'Great day for indoor venues';
  if (temp < 50) return 'Bundle up for outdoor adventures';
  if (temp > 85) return 'Stay cool with indoor activities';
  return 'Good weather for exploring';
};

export const WeatherBanner: React.FC<WeatherBannerProps> = ({
  temp,
  feels,
  humidity,
  wind,
  cond,
  icon,
  hint
}) => {
  const weatherHint = hint || getHint(cond, temp);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getWeatherIcon(cond)}
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {temp}°F
            </div>
            <div className="text-sm text-gray-600">
              Feels like {feels}°F
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>💧 {humidity}%</span>
            <span>💨 {wind} mph</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {weatherHint}
          </div>
        </div>
      </div>
    </div>
  );
}; 