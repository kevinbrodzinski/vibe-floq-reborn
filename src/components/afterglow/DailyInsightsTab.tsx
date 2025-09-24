import { useAISummary } from '@/hooks/useAISummary';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DailyInsightsTabProps {
  afterglowId: string;
  aiSummary?: string | null;
}

export default function DailyInsightsTab({ afterglowId, aiSummary }: DailyInsightsTabProps) {
  const { generateSummary, isGenerating } = useAISummary();

  const handleGenerate = async () => {
    try {
      console.log('Generating AI summary for afterglow:', afterglowId);
      await generateSummary(afterglowId);
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      // Error handling is done in the hook's onError callback
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">AI Insights</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Generate personalized insights about your day
        </p>
      </div>

      {aiSummary ? (
        <div className="bg-card/50 rounded-lg p-4 border border-border/30">
          <p className="text-sm font-medium text-foreground">{aiSummary}</p>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="w-full mt-4"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Regenerating...
            </>
          ) : (
            'Regenerate Summary'
          )}
        </Button>
      </div>
    ) : (
      <Button 
        onClick={handleGenerate} 
        disabled={isGenerating || !afterglowId}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating insights...
          </>
        ) : (
          'Generate AI Summary'
        )}
      </Button>
    )}
      
      <p className="text-sm text-muted-foreground text-center">
        AI-powered analysis of your day's activities, connections, and vibes.
      </p>
    </div>
  );
}