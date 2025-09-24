import { useState, useEffect } from 'react';
import { getWeather, getWeatherModulation } from '@/lib/api/weather';
import type { WeatherSnapshot } from '@/types/weather';

export function useWeatherModulation(lat?: number, lng?: number) {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [modulation, setModulation] = useState({ precipMod: 1.0, visMod: 1.0, windMod: 1.0 });
  const [lastUpdate, setLastUpdate] = useState(0);

  useEffect(() => {
    if (!lat || !lng) return;
    
    const updateWeather = async () => {
      const now = Date.now();
      // Only update every 15 minutes
      if (now - lastUpdate < 15 * 60 * 1000) return;
      
      try {
        const wx = await getWeather(lat, lng);
        setWeather(wx);
        setModulation(getWeatherModulation(wx));
        setLastUpdate(now);
      } catch (error) {
        console.warn('[WeatherModulation] Update failed:', error);
      }
    };

    updateWeather();
  }, [lat, lng, lastUpdate]);

  return { weather, modulation };
}