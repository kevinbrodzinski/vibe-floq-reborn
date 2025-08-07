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
    console.log('[SharedActivity] Generated prompt:', prompt.substring(0, 200) + '...');
    
    const raw = await callGenerateIntelligence(
      'shared-activity-suggestions',
      { prompt, temperature: 0.7, max_tokens: 400 }
    );
    
    console.log('[SharedActivity] Raw response:', raw);
    
    // Parse the response - it should be a JSON array
    const suggestions = JSON.parse(raw) as ActivitySuggestion[];
    console.log('[SharedActivity] Parsed suggestions:', suggestions);
    
    return Array.isArray(suggestions) ? suggestions : [];
  } catch (error) {
    console.error('[SharedActivity] Failed to generate shared activity suggestions:', error);
    console.error('[SharedActivity] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    // Return empty array to let the component handle fallbacks
    return [];
  }
};

// Re-export types for convenience
export type { SharedActivityContext, ActivitySuggestion } from './prompts';