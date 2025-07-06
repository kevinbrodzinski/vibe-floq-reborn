import { useState, useEffect } from 'react';
import { useTimeSyncContext } from '@/components/TimeSyncProvider';

export interface Friend {
  id: string;
  name: string;
  distance: number; // km
  vibe: string;
  isActive: boolean;
  location?: string;
  lastSeen: string;
}

export interface SocialContext {
  nearbyFriends: Friend[];
  activeFloqs: number;
  currentVibe: string;
  socialEnergy: number; // 0-100
  recommendations: string[];
  contextualPrompts: string[];
}

export const useSocialContext = () => {
  const { timeState, hour } = useTimeSyncContext();
  
  const [socialContext, setSocialContext] = useState<SocialContext>({
    nearbyFriends: [
      { id: '1', name: 'Julia', distance: 0.3, vibe: 'chill', isActive: true, location: 'Echo Rooftop', lastSeen: '2 min ago' },
      { id: '2', name: 'Marcus', distance: 0.8, vibe: 'social', isActive: true, location: 'Downtown', lastSeen: '5 min ago' },
      { id: '3', name: 'Sam', distance: 1.2, vibe: 'flowing', isActive: false, location: 'Home', lastSeen: '1 hour ago' },
      { id: '4', name: 'Alex', distance: 2.1, vibe: 'hype', isActive: true, location: 'Warehouse', lastSeen: 'just now' },
    ],
    activeFloqs: 3,
    currentVibe: 'social',
    socialEnergy: 75,
    recommendations: [],
    contextualPrompts: []
  });

  useEffect(() => {
    const updateSocialContext = () => {
      const activeFriends = socialContext.nearbyFriends.filter(f => f.isActive && f.distance < 2);
      const socialEnergy = Math.min(100, (activeFriends.length * 25) + (hour > 18 ? 30 : 0));
      
      let recommendations: string[] = [];
      let contextualPrompts: string[] = [];

      // Time-based contextual intelligence
      switch (timeState) {
        case 'dawn':
        case 'morning':
          if (activeFriends.length > 0) {
            recommendations.push("Start a morning floq with nearby friends");
            contextualPrompts.push("Julia is up early at Echo Rooftop. Want to join for morning vibes?");
          }
          recommendations.push("Set your energy intention for the day");
          break;
          
        case 'afternoon':
          if (activeFriends.length > 2) {
            contextualPrompts.push("3 friends are active nearby. Time to check the pulse?");
          }
          recommendations.push("Check who's building energy for tonight");
          break;
          
        case 'evening':
        case 'night':
          if (activeFriends.length > 0) {
            const closeActiveFriend = activeFriends.find(f => f.distance < 0.5);
            if (closeActiveFriend) {
              contextualPrompts.push(`${closeActiveFriend.name} is super close at ${closeActiveFriend.location}. Join them?`);
            }
            contextualPrompts.push("Peak social energy detected. Create a floq?");
          }
          recommendations.push("Join the energy wave", "Create something epic", "Follow the pulse");
          break;
          
        case 'late':
          const intimateFriends = activeFriends.filter(f => f.vibe === 'chill' || f.vibe === 'flowing');
          if (intimateFriends.length > 0) {
            contextualPrompts.push("Close connections are active. Time for deeper vibes?");
          }
          recommendations.push("Connect with your inner circle", "Reflect on the night");
          break;
      }

      // Social energy-based prompts
      if (socialEnergy > 80) {
        contextualPrompts.push("High energy detected! The field is alive tonight.");
      } else if (socialEnergy < 30 && timeState === 'evening') {
        contextualPrompts.push("Energy is quiet. Want to spark something?");
      }

      setSocialContext(prev => ({
        ...prev,
        socialEnergy,
        recommendations,
        contextualPrompts
      }));
    };

    updateSocialContext();
    const interval = setInterval(updateSocialContext, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [timeState, hour, socialContext.nearbyFriends]);

  const shouldSurfaceAI = (): boolean => {
    // AI surfaces when:
    // 1. High social context change
    // 2. Friends become active nearby
    // 3. Peak social energy times
    // 4. User hasn't interacted recently
    
    const hasNearbyActiveFriends = socialContext.nearbyFriends.some(f => f.isActive && f.distance < 0.5);
    const isPeakSocialTime = ['evening', 'night'].includes(timeState);
    const hasHighSocialEnergy = socialContext.socialEnergy > 70;
    
    return hasNearbyActiveFriends || (isPeakSocialTime && hasHighSocialEnergy);
  };

  return {
    socialContext,
    shouldSurfaceAI,
    updateContext: (updates: Partial<SocialContext>) => {
      setSocialContext(prev => ({ ...prev, ...updates }));
    }
  };
};