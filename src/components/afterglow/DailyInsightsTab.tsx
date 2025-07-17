import { useAISummary } from '@/hooks/useAISummary';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DailyInsightsTabProps {
  id: string;
}

export default function DailyInsightsTab({ id }: DailyInsightsTabProps) {
  const { generateSummary, isGenerating } = useAISummary();

  const handleGenerate = async () => {
    await generateSummary(id);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">AI Insights</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Generate personalized insights about your day
        </p>
      </div>

      <Button 
        onClick={handleGenerate} 
        disabled={isGenerating}
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
      
      <p className="text-sm text-muted-foreground text-center">
        AI-powered analysis of your day's activities, connections, and vibes coming soon.
      </p>
    </div>
  );
}