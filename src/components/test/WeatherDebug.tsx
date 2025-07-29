import React from 'react';
import { useWeather } from '@/hooks/useWeather';
import { useGeolocation } from '@/hooks/useGeolocation';

export const WeatherDebug: React.FC = () => {
  const { lat, lng, error: geoError, isLoading: geoLoading } = useGeolocation();
  const { data: weatherData, isLoading: weatherLoading, error: weatherError } = useWeather();

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-lg font-bold mb-4">Weather Debug</h2>
      
      <div className="space-y-2">
        <div>
          <strong>Geolocation:</strong>
          <div>Lat: {lat}</div>
          <div>Lng: {lng}</div>
          <div>Loading: {geoLoading ? 'Yes' : 'No'}</div>
          <div>Error: {geoError || 'None'}</div>
        </div>
        
        <div>
          <strong>Weather Data:</strong>
          <div>Loading: {weatherLoading ? 'Yes' : 'No'}</div>
          <div>Error: {weatherError?.message || 'None'}</div>
          <div>Data: {weatherData ? JSON.stringify(weatherData, null, 2) : 'No data'}</div>
        </div>
      </div>
    </div>
  );
}; 