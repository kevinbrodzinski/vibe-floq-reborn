import { callGenerateIntelligence } from '@/lib/api/callGenerateIntelligence';
import {
  buildSharedActivitySuggestionsPrompt,
  SharedActivityContext,
  ActivitySuggestion,
} from './prompts';

export const getSharedActivitySuggestions = async (
  ctx: SharedActivityContext,
): Promise<ActivitySuggestion[]> => {
  try {
    const prompt = buildSharedActivitySuggestionsPrompt(ctx);
    const response = await callGenerateIntelligence(
      'shared-activity-suggestions',
      { prompt, temperature: 0.7, max_tokens: 400 }
    );
    
    // Response is already parsed by supabase.functions.invoke()
    const suggestions = response as ActivitySuggestion[];
    return Array.isArray(suggestions) ? suggestions : [];
  } catch (error) {
    console.error('Failed to generate shared activity suggestions:', error);
    // Return empty array to let the component handle fallbacks
    return [];
  }
};

// Re-export types for convenience
export type { SharedActivityContext, ActivitySuggestion } from './prompts';