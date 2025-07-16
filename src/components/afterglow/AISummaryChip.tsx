import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface AISummaryChipProps {
  summary?: string;
  isGenerating?: boolean;
  onGenerate?: () => void;
}

export function AISummaryChip({ summary, isGenerating, onGenerate }: AISummaryChipProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const prefersReduced = usePrefersReducedMotion();
  
  const MotionDiv = prefersReduced ? 'div' : motion.div;
  const MotionButton = prefersReduced ? Button : motion(Button);

  if (!summary && !isGenerating) {
    return (
      <MotionButton
        variant="outline"
        size="sm"
        onClick={onGenerate}
        className="mb-6 mx-auto flex items-center gap-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 hover:from-primary/20 hover:to-secondary/20 transition-all duration-300"
        whileHover={prefersReduced ? undefined : { scale: 1.02 }}
        whileTap={prefersReduced ? undefined : { scale: 0.98 }}
      >
        <Sparkles className="h-4 w-4 text-primary" />
        Generate AI Summary
      </MotionButton>
    );
  }

  if (isGenerating) {
    return (
      <div className="mb-6 mx-auto flex items-center justify-center">
        <Badge 
          variant="secondary" 
          className="px-4 py-2 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20"
        >
          <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
          Generating AI summary...
        </Badge>
      </div>
    );
  }

  return (
    <div className="mb-6 mx-auto max-w-2xl">
      <MotionDiv
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        initial={prefersReduced ? undefined : { opacity: 0, y: 10 }}
        animate={prefersReduced ? undefined : { opacity: 1, y: 0 }}
        transition={prefersReduced ? undefined : { duration: 0.4 }}
      >
        <Badge 
          variant="secondary" 
          className="px-4 py-3 text-sm bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 hover:from-primary/15 hover:to-secondary/15 transition-all duration-300 w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-medium text-foreground line-clamp-2">
              {summary}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 ml-2 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-2 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
          )}
        </Badge>
      </MotionDiv>
      
      <AnimatePresence>
        {isExpanded && (
          <MotionDiv
            initial={prefersReduced ? undefined : { opacity: 0, height: 0 }}
            animate={prefersReduced ? undefined : { opacity: 1, height: 'auto' }}
            exit={prefersReduced ? undefined : { opacity: 0, height: 0 }}
            transition={prefersReduced ? undefined : { duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 bg-card border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-foreground mb-2">
                    AI Daily Digest
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {summary}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    This summary was generated using AI to capture the essence of your day.
                  </p>
                </div>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}