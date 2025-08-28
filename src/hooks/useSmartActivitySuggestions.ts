import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SmartActivitySuggestion {
  id: string;
  title: string;
  description: string;
  emoji?: string;
  category: string;
  confidence: number; // 0-1
  estimatedDuration?: string;
  distance?: string;
  energyLevel?: 'low' | 'medium' | 'high';
  venueId?: string;
  venueName?: string;
  reasoning: string[];
  context: {
    type: 'solo' | 'group' | 'date' | 'friends';
    timeContext: 'now' | 'evening' | 'weekend';
    weatherSuitable?: boolean;
    crowdLevel?: 'low' | 'medium' | 'high';
  };
  metadata: {
    costEstimate?: string;
    difficultyLevel?: 'easy' | 'moderate' | 'challenging';
    socialLevel?: 'quiet' | 'moderate' | 'social';
    indoorOutdoor?: 'indoor' | 'outdoor' | 'both';
  };
}

interface SmartActivitySuggestionsParams {
  lat: number | null;
  lng: number | null;
  context: 'solo' | 'group' | 'date' | 'friends';
  groupSize?: number;
  timeContext?: 'now' | 'evening' | 'weekend';
  vibe?: string | null;
  enabled?: boolean;
}

export const useSmartActivitySuggestions = (
  params: SmartActivitySuggestionsParams,
  refreshKey: number = 0
) => {
  const { user } = useAuth();
  const { lat, lng, context, groupSize = 1, timeContext = 'now', vibe, enabled = true } = params;

  return useQuery<SmartActivitySuggestion[]>({
    queryKey: [
      'smart-activity-suggestions',
      lat,
      lng,
      context,
      groupSize,
      timeContext,
      vibe,
      user?.id,
      refreshKey
    ],
    enabled: enabled && !!lat && !!lng && !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    queryFn: async () => {
      if (!lat || !lng || !user?.id) {
        throw new Error('Missing required parameters');
      }

      try {
        // Try to get AI-powered suggestions from intelligence function
        const { data, error } = await supabase.functions.invoke('generate-intelligence', {
          body: {
            mode: 'activity-suggestions',
            profile_id: user.id,
            lat,
            lng,
            context: {
              type: context,
              groupSize,
              timeContext,
              vibe: vibe || null,
              timestamp: new Date().toISOString()
            },
            temperature: 0.7,
            max_tokens: 600
          }
        });

        if (!error && data?.suggestions) {
          return data.suggestions as SmartActivitySuggestion[];
        }

        // Fallback: generate contextual suggestions
        console.warn('AI activity suggestions failed, using fallback:', error);
        return generateFallbackSuggestions({ lat, lng, context, groupSize, timeContext, vibe });

      } catch (error) {
        console.error('Failed to fetch smart activity suggestions:', error);
        // Return basic fallback suggestions
        return generateBasicSuggestions({ context, groupSize, timeContext, vibe });
      }
    }
  });
};

function generateFallbackSuggestions(params: {
  lat: number;
  lng: number;
  context: string;
  groupSize: number;
  timeContext: string;
  vibe?: string | null;
}): SmartActivitySuggestion[] {
  const { context, groupSize, timeContext, vibe } = params;
  const suggestions: SmartActivitySuggestion[] = [];

  // Base suggestions by context
  if (context === 'solo') {
    suggestions.push(
      {
        id: 'solo-cafe-work',
        title: 'Find a cozy cafe to work',
        description: 'Perfect for productivity with a change of scenery. Great coffee and ambient atmosphere await.',
        emoji: '☕',
        category: 'productivity',
        confidence: 0.85,
        estimatedDuration: '2-3 hours',
        distance: 'Within 1km',
        energyLevel: 'medium',
        reasoning: [
          'You prefer solo activities with ambient social energy',
          'Coffee shops provide perfect focus environment',
          'Opportunity for spontaneous social interactions'
        ],
        context: {
          type: 'solo',
          timeContext: timeContext as any,
          weatherSuitable: true,
          crowdLevel: 'medium'
        },
        metadata: {
          costEstimate: '$5-15',
          difficultyLevel: 'easy',
          socialLevel: 'quiet',
          indoorOutdoor: 'indoor'
        }
      },
      {
        id: 'solo-walk-explore',
        title: 'Take an exploration walk',
        description: 'Discover new neighborhoods and hidden gems. Perfect for clearing your mind and getting exercise.',
        emoji: '🚶‍♂️',
        category: 'exploration',
        confidence: 0.78,
        estimatedDuration: '45-90 min',
        distance: 'Variable',
        energyLevel: 'medium',
        reasoning: [
          'Walking boosts creativity and mood',
          'Exploration satisfies curiosity and discovery',
          'Light exercise improves overall wellbeing'
        ],
        context: {
          type: 'solo',
          timeContext: timeContext as any,
          weatherSuitable: timeContext !== 'evening',
          crowdLevel: 'low'
        },
        metadata: {
          costEstimate: 'Free',
          difficultyLevel: 'easy',
          socialLevel: 'quiet',
          indoorOutdoor: 'outdoor'
        }
      }
    );
  }

  if (context === 'group' || groupSize > 1) {
    suggestions.push(
      {
        id: 'group-restaurant',
        title: 'Try a new restaurant together',
        description: 'Shared meals create lasting memories. Discover flavors and enjoy conversation in a welcoming atmosphere.',
        emoji: '🍽️',
        category: 'dining',
        confidence: 0.90,
        estimatedDuration: '1.5-2 hours',
        distance: 'Within 2km',
        energyLevel: 'medium',
        reasoning: [
          'Food brings people together naturally',
          'Restaurants provide comfortable social setting',
          'Trying new cuisines creates shared experiences'
        ],
        context: {
          type: 'group',
          timeContext: timeContext as any,
          weatherSuitable: true,
          crowdLevel: 'medium'
        },
        metadata: {
          costEstimate: '$15-40 per person',
          difficultyLevel: 'easy',
          socialLevel: 'social',
          indoorOutdoor: 'indoor'
        }
      },
      {
        id: 'group-activity-venue',
        title: 'Visit an interactive venue',
        description: 'Bowling, mini-golf, or arcade games. Activities that bring out everyone\'s playful side.',
        emoji: '🎳',
        category: 'entertainment',
        confidence: 0.82,
        estimatedDuration: '2-3 hours',
        distance: 'Within 3km',
        energyLevel: 'high',
        reasoning: [
          'Interactive activities break social ice',
          'Friendly competition builds bonds',
          'Engaging activities create memorable moments'
        ],
        context: {
          type: 'group',
          timeContext: timeContext as any,
          weatherSuitable: true,
          crowdLevel: 'high'
        },
        metadata: {
          costEstimate: '$10-25 per person',
          difficultyLevel: 'easy',
          socialLevel: 'social',
          indoorOutdoor: 'indoor'
        }
      }
    );
  }

  // Vibe-based adjustments
  if (vibe === 'energetic' || vibe === 'social') {
    suggestions.forEach(s => {
      s.confidence = Math.min(1, s.confidence + 0.1);
      if (s.energyLevel !== 'high') s.energyLevel = 'medium';
    });
  }

  if (vibe === 'chill' || vibe === 'contemplative') {
    suggestions.push({
      id: 'peaceful-location',
      title: 'Find a peaceful spot',
      description: 'A quiet park, library, or serene cafe. Perfect for reflection, reading, or gentle conversation.',
      emoji: '🌿',
      category: 'relaxation',
      confidence: 0.88,
      estimatedDuration: '1-2 hours',
      distance: 'Within 1.5km',
      energyLevel: 'low',
      reasoning: [
        'Peaceful environments reduce stress',
        'Quiet spaces enable deeper thinking',
        'Nature or calm settings restore energy'
      ],
      context: {
        type: context as any,
        timeContext: timeContext as any,
        weatherSuitable: true,
        crowdLevel: 'low'
      },
      metadata: {
        costEstimate: 'Free-$10',
        difficultyLevel: 'easy',
        socialLevel: 'quiet',
        indoorOutdoor: 'both'
      }
    });
  }

  // Time-based suggestions
  if (timeContext === 'evening') {
    suggestions.push({
      id: 'evening-social',
      title: 'Evening social experience',
      description: 'Bar, lounge, or evening event. Perfect timing for winding down and connecting with others.',
      emoji: '🌆',
      category: 'nightlife',
      confidence: 0.75,
      estimatedDuration: '2-4 hours',
      distance: 'Within 2km',
      energyLevel: 'medium',
      reasoning: [
        'Evening hours ideal for socializing',
        'Relaxed atmosphere after day activities',
        'Social venues peak in evening hours'
      ],
      context: {
        type: context as any,
        timeContext: 'evening',
        weatherSuitable: true,
        crowdLevel: 'medium'
      },
      metadata: {
        costEstimate: '$15-35 per person',
        difficultyLevel: 'easy',
        socialLevel: 'social',
        indoorOutdoor: 'indoor'
      }
    });
  }

  return suggestions.slice(0, 4); // Return top 4 suggestions
}

function generateBasicSuggestions(params: {
  context: string;
  groupSize: number;
  timeContext: string;
  vibe?: string | null;
}): SmartActivitySuggestion[] {
  // Minimal fallback suggestions when all else fails
  return [
    {
      id: 'basic-explore',
      title: 'Explore nearby',
      description: 'Take a walk and see what you discover in your area.',
      emoji: '🗺️',
      category: 'exploration',
      confidence: 0.65,
      estimatedDuration: '30-60 min',
      energyLevel: 'medium',
      reasoning: ['Simple and accessible activity', 'Always available option'],
      context: {
        type: params.context as any,
        timeContext: params.timeContext as any
      },
      metadata: {
        costEstimate: 'Free',
        difficultyLevel: 'easy',
        socialLevel: 'moderate',
        indoorOutdoor: 'outdoor'
      }
    }
  ];
}