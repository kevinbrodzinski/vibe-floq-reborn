import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'sonner';

export function useAISummary() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isMounted = useRef(true);

  useEffect(() => () => { isMounted.current = false; }, []);

  const generateSummary = async (afterglowId: string): Promise<string | null> => {
    if (!user || !afterglowId) return null;

    if (isMounted.current) setIsGenerating(true);
    if (isMounted.current) setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-afterglow-summary',
        {
          body: { afterglow_id: afterglowId }
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const summary = data?.ai_summary;
      if (!summary) {
        throw new Error('No summary generated');
      }

      if (!data.cached) {
        toast.success('AI summary generated successfully!');
      }

      return summary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate AI summary';
      if (isMounted.current) setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error generating AI summary:', err);
      return null;
    } finally {
      if (isMounted.current) setIsGenerating(false);
    }
  };

  return {
    generateSummary,
    isGenerating,
    error
  };
}