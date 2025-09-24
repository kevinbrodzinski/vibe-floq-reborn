import { Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface PlanSummaryFallbackProps {
  onGenerateSummary?: () => void;
  isGenerating?: boolean;
  className?: string;
}

export function PlanSummaryFallback({
  onGenerateSummary,
  isGenerating = false,
  className = ''
}: PlanSummaryFallbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 border border-dashed border-border rounded-lg text-center ${className}`}
    >
      <div className="flex flex-col items-center space-y-3">
        <motion.div
          animate={isGenerating ? { rotate: 360 } : {}}
          transition={{ duration: 2, repeat: isGenerating ? Infinity : 0 }}
        >
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </motion.div>
        
        <div>
          <h3 className="text-sm font-medium text-foreground mb-1">
            {isGenerating ? 'Creating AI Summary...' : 'No Summary Yet'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isGenerating 
              ? 'AI is crafting a beautiful summary of your plan'
              : 'Generate an AI summary to capture the vibe of your plan'
            }
          </p>
        </div>
        
        {onGenerateSummary && !isGenerating && (
          <Button
            size="sm"
            variant="outline"
            onClick={onGenerateSummary}
            className="gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            Generate Summary
          </Button>
        )}
      </div>
    </motion.div>
  );
}