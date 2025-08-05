import React from 'react';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';
import { useWeather } from '@/hooks/useWeather';
import { WeatherBanner } from '@/components/ui/WeatherBanner';

export const WeatherTest: React.FC = () => {
  const { coords } = useUnifiedLocation({
    hookId: 'WeatherTest',
    enableTracking: false,
    enablePresence: false
  });
  const lat = coords?.lat;
  const lng = coords?.lng;
  const { data: weather, isLoading, error } = useWeather();

  if (isLoading) return <div className="p-4">Loading weather...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;
  if (!weather) return <div className="p-4 text-gray-500">No weather data available</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Weather Test</h2>
      <WeatherBanner
        temp={(weather as any)?.temperatureF || 0}
        feels={(weather as any)?.feelsLikeF || 0}
        humidity={(weather as any)?.humidity || 0}
        wind={(weather as any)?.windMph || 0}
        cond={(weather as any)?.condition || 'clear'}
        icon={(weather as any)?.icon || '01d'}
      />
      <div className="mt-4 text-sm text-gray-600">
        <p>Location: {lat}, {lng}</p>
        <p>Last updated: {new Date((weather as any)?.created_at || Date.now()).toLocaleString()}</p>
      </div>
    </div>
  );
}; 