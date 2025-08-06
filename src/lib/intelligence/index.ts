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
    const raw = await callGenerateIntelligence(
      'shared-activity-suggestions',
      { prompt, temperature: 0.7, max_tokens: 400 }
    );
    
    // Parse the response - it should be a JSON array
    const suggestions = JSON.parse(raw) as ActivitySuggestion[];
    return Array.isArray(suggestions) ? suggestions : [];
  } catch (error) {
    console.error('Failed to generate shared activity suggestions:', error);
    // Return empty array to let the component handle fallbacks
    return [];
  }
};

// Re-export types for convenience
export type { SharedActivityContext, ActivitySuggestion } from './prompts';