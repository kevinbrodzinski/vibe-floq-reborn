import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Edit2, RefreshCw } from 'lucide-react';
import { usePlanSummary, useGeneratePlanSummary, type SummaryMode } from '@/hooks/usePlanSummaries';
import { PlanSummaryEditModal } from './PlanSummaryEditModal';

interface PlanSummaryCardProps {
  planId: string;
  mode: SummaryMode;
  editable?: boolean;
  className?: string;
  title?: string;
}

export function PlanSummaryCard({ 
  planId, 
  mode, 
  editable = false,
  className = '',
  title
}: PlanSummaryCardProps) {
  const [editing, setEditing] = useState(false);
  const { data: summary, isLoading, error } = usePlanSummary(planId, mode);
  const generateSummary = useGeneratePlanSummary();

  const handleRegenerate = () => {
    generateSummary.mutate({ planId, mode });
  };

  if (isLoading) return <Skeleton className="h-32 w-full rounded-xl" />;

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Failed to load summary. Please try again.
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground italic mb-3">
            No summary available yet.
          </div>
          <Button 
            size="sm" 
            onClick={handleRegenerate}
            disabled={generateSummary.isPending}
          >
            {generateSummary.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {error ? 'Retry Generate' : 'Generate Summary'}
              </>
            )}
          </Button>
          {error && (
            <p className="text-xs text-destructive mt-2">
              Generation failed. Please try again.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">
                {title || (mode === 'finalized' ? 'Plan Summary' : 'Experience Afterglow')}
              </span>
            </div>
            {editable && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(true)}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRegenerate}
                  disabled={generateSummary.isPending}
                >
                  <RefreshCw className={`w-3 h-3 ${generateSummary.isPending ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent 
          className="text-sm leading-relaxed whitespace-pre-line" 
          aria-live="polite"
        >
          {summary.summary}
        </CardContent>
      </Card>

      {editing && (
        <PlanSummaryEditModal
          planId={planId}
          mode={mode}
          summary={summary.summary}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}