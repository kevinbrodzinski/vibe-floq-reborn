/**
 * Social Weather Context
 * Provides social weather status across field components
 */

import { createContext, useContext, useState, ReactNode } from 'react';
import type { SocialWeatherPhrase } from '@/features/field/status/SocialWeatherComposer';

interface SocialWeatherContextType {
  phrase: SocialWeatherPhrase | null;
  updatePhrase: (phrase: SocialWeatherPhrase | null) => void;
}

const SocialWeatherContext = createContext<SocialWeatherContextType | null>(null);

export const SocialWeatherProvider = ({ children }: { children: ReactNode }) => {
  const [phrase, setPhrase] = useState<SocialWeatherPhrase | null>(null);

  const updatePhrase = (newPhrase: SocialWeatherPhrase | null) => {
    setPhrase(newPhrase);
  };

  return (
    <SocialWeatherContext.Provider value={{ phrase, updatePhrase }}>
      {children}
    </SocialWeatherContext.Provider>
  );
};

export const useSocialWeather = () => {
  const context = useContext(SocialWeatherContext);
  if (!context) {
    throw new Error('useSocialWeather must be used within SocialWeatherProvider');
  }
  return context;
};