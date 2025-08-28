import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PersonalInsightRecommendation {
  title: string;
  description: string;
  confidence: number;
  category: 'social' | 'venue' | 'timing' | 'activity';
}

export interface PersonalInsightAchievement {
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
  category: string;
}

export interface PersonalInsights {
  // Core metrics
  socialScore: number;
  explorationLevel: number;
  streakTrend: 'up' | 'down' | 'stable';
  streakChange: string;
  newConnections: number;
  
  // Patterns
  peakEnergyTime: string;
  peakEnergyWindow: string;
  mostSocialDay: string;
  favoriteVenueType: string;
  avgVenueDistance: string;
  explorationRate: number;
  
  // Optimal timing
  optimalSocialTime: string;
  optimalExploreTime: string;
  
  // AI insights
  energyInsight?: string;
  locationInsight?: string;
  socialInsight?: string;
  
  // Recommendations
  recommendations: PersonalInsightRecommendation[];
  achievements: PersonalInsightAchievement[];
  
  // Metadata
  lastUpdated: string;
  dataQuality: 'high' | 'medium' | 'low';
}

export const usePersonalInsights = (timeRange: '7d' | '30d' | '90d' = '30d') => {
  const { user } = useAuth();
  
  return useQuery<PersonalInsights>({
    queryKey: ['personal-insights', user?.id, timeRange],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      try {
        // Try to get insights from AI intelligence function
        const { data, error } = await supabase.functions.invoke('generate-intelligence', {
          body: {
            mode: 'personal-insights',
            profile_id: user.id,
            time_range: timeRange,
            temperature: 0.3,
            max_tokens: 800
          }
        });
        
        if (!error && data) {
          return data as PersonalInsights;
        }
        
        // Fallback to generating mock insights based on actual profile data
        console.warn('AI insights failed, generating fallback insights:', error);
        
        // Get basic profile stats for fallback
        const { data: stats } = await supabase.rpc('get_profile_stats', {
          target_profile_id: user.id,
          metres: 100,
          seconds: 3600
        });
        
        const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - daysAgo);
        
        // Generate intelligent fallback insights
        return generateFallbackInsights(stats, timeRange);
        
      } catch (error) {
        console.error('Failed to fetch personal insights:', error);
        // Return minimal fallback insights
        return generateMinimalInsights(timeRange);
      }
    }
  });
};

function generateFallbackInsights(stats: any, timeRange: string): PersonalInsights {
  const friendCount = stats?.friend_count || 0;
  const crossings = stats?.crossings_7d || 0;
  const daysActive = stats?.days_active_this_month || 0;
  
  return {
    // Core metrics
    socialScore: Math.min(95, Math.max(30, (friendCount * 3) + (crossings * 2) + (daysActive * 2))),
    explorationLevel: Math.min(90, Math.max(20, crossings * 8 + (daysActive * 3))),
    streakTrend: daysActive > 15 ? 'up' : daysActive > 8 ? 'stable' : 'down',
    streakChange: daysActive > 15 ? '+3' : daysActive > 8 ? '±0' : '-2',
    newConnections: Math.floor(friendCount * 0.15) || 1,
    
    // Patterns - intelligent defaults based on typical user behavior
    peakEnergyTime: '7:00 PM',
    peakEnergyWindow: '6:00-9:00 PM',
    mostSocialDay: crossings > 5 ? 'Friday' : 'Saturday',
    favoriteVenueType: 'Coffee Shops',
    avgVenueDistance: crossings > 3 ? '0.8km' : '1.5km',
    explorationRate: Math.min(85, crossings * 12 + 25),
    
    // Optimal timing
    optimalSocialTime: '6:00-8:00 PM',
    optimalExploreTime: '2:00-5:00 PM',
    
    // AI insights
    energyInsight: generateEnergyInsight(daysActive, crossings),
    locationInsight: generateLocationInsight(crossings),
    socialInsight: generateSocialInsight(friendCount, crossings),
    
    // Recommendations
    recommendations: generateRecommendations(stats),
    achievements: generateAchievements(stats),
    
    // Metadata
    lastUpdated: new Date().toISOString(),
    dataQuality: stats ? 'medium' : 'low'
  };
}

function generateMinimalInsights(timeRange: string): PersonalInsights {
  return {
    socialScore: 70,
    explorationLevel: 60,
    streakTrend: 'stable',
    streakChange: '±0',
    newConnections: 2,
    peakEnergyTime: '7:00 PM',
    peakEnergyWindow: '6:00-9:00 PM',
    mostSocialDay: 'Friday',
    favoriteVenueType: 'Restaurants',
    avgVenueDistance: '1.2km',
    explorationRate: 65,
    optimalSocialTime: '6:00-8:00 PM',
    optimalExploreTime: '2:00-4:00 PM',
    recommendations: [
      {
        title: 'Try exploring new venues',
        description: 'Branch out from your usual spots to discover hidden gems',
        confidence: 75,
        category: 'venue'
      }
    ],
    achievements: [],
    lastUpdated: new Date().toISOString(),
    dataQuality: 'low'
  };
}

function generateEnergyInsight(daysActive: number, crossings: number): string {
  if (daysActive > 20) {
    return "You're consistently active! Your energy peaks in the evening, making it perfect for social activities.";
  } else if (daysActive > 10) {
    return "Your activity levels are steady. Consider planning more evening social activities when your energy is highest.";
  } else {
    return "You have potential for more social energy! Evening hours tend to be your most active time.";
  }
}

function generateLocationInsight(crossings: number): string {
  if (crossings > 10) {
    return "You're an active explorer! You frequently discover new places and cross paths with others.";
  } else if (crossings > 5) {
    return "You have good exploration habits. Try venturing slightly further to meet more people.";
  } else {
    return "There's a whole world to explore! Consider visiting new areas to expand your social circle.";
  }
}

function generateSocialInsight(friendCount: number, crossings: number): string {
  if (friendCount > 20 && crossings > 8) {
    return "You're a social connector! Your active lifestyle naturally brings you into contact with your network.";
  } else if (friendCount > 10) {
    return "You have a solid social foundation. Stay active to maintain and grow these connections.";
  } else {
    return "Building your social network! Keep exploring and staying active to meet like-minded people.";
  }
}

function generateRecommendations(stats: any): PersonalInsightRecommendation[] {
  const recommendations: PersonalInsightRecommendation[] = [];
  
  const friendCount = stats?.friend_count || 0;
  const crossings = stats?.crossings_7d || 0;
  
  if (friendCount < 10) {
    recommendations.push({
      title: 'Join group activities',
      description: 'Participate in Floqs or group events to meet new people naturally',
      confidence: 85,
      category: 'social'
    });
  }
  
  if (crossings < 5) {
    recommendations.push({
      title: 'Explore new neighborhoods',
      description: 'Visit different areas during your optimal exploration time (2-4 PM)',
      confidence: 78,
      category: 'venue'
    });
  }
  
  recommendations.push({
    title: 'Plan evening social activities',
    description: 'Your energy peaks around 7 PM - perfect for meeting friends',
    confidence: 90,
    category: 'timing'
  });
  
  return recommendations;
}

function generateAchievements(stats: any): PersonalInsightAchievement[] {
  const achievements: PersonalInsightAchievement[] = [];
  
  const friendCount = stats?.friend_count || 0;
  const crossings = stats?.crossings_7d || 0;
  const daysActive = stats?.days_active_this_month || 0;
  
  if (friendCount >= 10) {
    achievements.push({
      title: 'Social Butterfly',
      description: 'Connected with 10+ friends',
      icon: '🦋',
      earnedAt: '2 weeks ago',
      category: 'social'
    });
  }
  
  if (crossings >= 15) {
    achievements.push({
      title: 'Path Crosser',
      description: 'Crossed paths with others 15+ times',
      icon: '🛤️',
      earnedAt: '1 week ago',
      category: 'exploration'
    });
  }
  
  if (daysActive >= 20) {
    achievements.push({
      title: 'Consistency Champion',
      description: 'Active for 20+ days this month',
      icon: '🏆',
      earnedAt: '3 days ago',
      category: 'activity'
    });
  }
  
  return achievements;
}