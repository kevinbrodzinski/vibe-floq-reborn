import React from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useWeather } from '@/hooks/useWeather';
import { WeatherBanner } from '@/components/ui/WeatherBanner';

export const WeatherTest: React.FC = () => {
  const { lat, lng } = useGeolocation();
  const { data: weather, isLoading, error } = useWeather(lat, lng);

  if (isLoading) return <div className="p-4">Loading weather...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error.message}</div>;
  if (!weather) return <div className="p-4 text-gray-500">No weather data available</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Weather Test</h2>
      <WeatherBanner
        temp={weather.temperatureF}
        feels={weather.feelsLikeF}
        humidity={weather.humidity}
        wind={weather.windMph}
        cond={weather.condition}
        icon={weather.icon}
      />
      <div className="mt-4 text-sm text-gray-600">
        <p>Location: {lat}, {lng}</p>
        <p>Last updated: {new Date(weather.created_at).toLocaleString()}</p>
      </div>
    </div>
  );
}; 