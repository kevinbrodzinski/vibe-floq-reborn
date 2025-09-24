import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { SmartActivitySuggestion, ContextType, TimeCtx } from '@/types/recommendations';
import type { AiActivityResponse } from '@/types/intelligence';

const generateFallbackSuggestions = (params: {
  lat: number;
  lng: number;
  context: ContextType;
  groupSize: number;
  timeContext: TimeCtx;
  vibe?: string | null;
}): SmartActivitySuggestion[] => {
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
        metadata: {
          costEstimate: '$10-25 per person',
          difficultyLevel: 'easy',
          socialLevel: 'social',
          indoorOutdoor: 'indoor'
        }
      }
    );
  }

  return suggestions.slice(0, 4); // Return top 4 suggestions
};

const generateBasicSuggestions = (params: {
  context: ContextType;
  groupSize: number;
  timeContext: TimeCtx;
  vibe?: string | null;
}): SmartActivitySuggestion[] => {
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
      reasoning: ['Simple and accessible activity', 'Always available option']
    }
  ];
};

export const useSmartActivitySuggestions = (
  params: {
    lat: number | null;
    lng: number | null;
    context: ContextType;
    groupSize: number;
    timeContext: TimeCtx;
    vibe?: string | null;
    enabled?: boolean;
  },
  refreshKey: number = 0
) => {
  const { user } = useAuth();
  const { lat, lng, context, groupSize, timeContext, vibe, enabled = true } = params;

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
    queryFn: async (): Promise<SmartActivitySuggestion[]> => {
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

        if (!error && (data as AiActivityResponse)?.suggestions) {
          console.info('[reco_shown]', { type: 'activity', count: (data as AiActivityResponse).suggestions.length, context, ts: Date.now() });
          return (data as AiActivityResponse).suggestions;
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