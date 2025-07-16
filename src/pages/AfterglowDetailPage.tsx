import React, { useState, memo, useMemo, useRef } from 'react';
import { Timeline } from "@/components/ui/timeline";
import { useParams, Link } from "react-router-dom";
import { useAfterglowDetail } from "@/lib/afterglow-helpers";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTogglePinned } from "@/hooks/useOptimisticMutations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { 
  Share2, 
  Pin, 
  PinOff, 
  AlertCircle
} from "lucide-react";
import { LazyShareModal } from '@/components/LazyShareModal';
import { ParallaxMoment } from '@/components/timeline/ParallaxMoment';
import { GenerativeBackdrop } from '@/components/background/GenerativeBackdrop';
import { AISummaryChip } from '@/components/afterglow/AISummaryChip';
import { useAISummary } from '@/hooks/useAISummary';

// This component is now replaced by ParallaxMoment

export default function AfterglowDetailPage() {
  const { afterglowId } = useParams<{ afterglowId: string }>();
  const [shareOpen, setShareOpen] = useState(false);
  const { mutate: togglePinned } = useTogglePinned();
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();
  const { generateSummary, isGenerating: isGeneratingSummary } = useAISummary();
  
  if (!afterglowId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive">Invalid afterglow ID</h2>
          <Link to="/archive" className="text-primary hover:underline mt-4 inline-block">
            ← Back to Archive
          </Link>
        </div>
      </div>
    );
  }
  
  const { data, isLoading, isError, error } = useAfterglowDetail(afterglowId);

  const handleTogglePin = () => {
    if (!data?.afterglow) return
    togglePinned({ 
      id: data.afterglow.id, 
      pinned: !data.afterglow.is_pinned 
    })
  }

  const handleGenerateSummary = async () => {
    if (!data?.afterglow) return
    await generateSummary(data.afterglow.id)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-destructive">Error</h2>
          <p className="text-muted-foreground mt-2">{error?.message || "Error loading afterglow"}</p>
          <Link to="/archive" className="text-primary hover:underline mt-4 inline-block">
            ← Back to Archive
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold">No afterglow found</h2>
          <p className="text-muted-foreground mt-2">This afterglow doesn't exist or hasn't been generated yet.</p>
          <Link to="/archive" className="text-primary hover:underline mt-4 inline-block">
            ← Back to Archive
          </Link>
        </div>
      </div>
    );
  }

  const { afterglow, moments } = data;

  return (
    <div ref={containerRef} className="container mx-auto px-4 py-8 max-w-4xl relative">
      {/* Generative Background */}
      <GenerativeBackdrop 
        dominantVibe={afterglow.dominant_vibe || 'chill'}
        className="rounded-2xl"
      />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">
            {format(new Date(afterglow.date), "EEEE, MMMM d, yyyy")}
          </h1>
          <p className="text-muted-foreground text-lg">{afterglow.summary_text}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleTogglePin}
            className={afterglow.is_pinned ? "text-primary" : ""}
          >
            {afterglow.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
          
          <Button variant="outline" onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* AI Summary */}
      <AISummaryChip
        summary={afterglow.ai_summary}
        isGenerating={isGeneratingSummary}
        onGenerate={handleGenerateSummary}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold text-primary">{afterglow.energy_score}</div>
          <div className="text-sm text-muted-foreground">Energy Score</div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold text-primary">{afterglow.social_intensity}</div>
          <div className="text-sm text-muted-foreground">Social Intensity</div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold text-primary">{afterglow.total_venues}</div>
          <div className="text-sm text-muted-foreground">Venues Visited</div>
        </div>
        <div className="bg-card rounded-lg p-4 border">
          <div className="text-2xl font-bold text-primary">{afterglow.total_floqs}</div>
          <div className="text-sm text-muted-foreground">Floqs Joined</div>
        </div>
      </div>

      {/* Dominant Vibe */}
      {afterglow.dominant_vibe && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Today's Vibe</h2>
          <Badge variant="secondary" className="text-base px-4 py-2">
            {afterglow.dominant_vibe}
          </Badge>
        </div>
      )}

      {/* Timeline */}
      {moments.length > 0 ? (
        <div className="mb-8 relative z-10">
          <h2 className="text-xl font-semibold mb-6">Your Journey</h2>
          <Timeline>
            {moments.map((moment, index) => (
              <ParallaxMoment
                key={moment.id || index} 
                moment={moment} 
                index={index}
                isLast={index === moments.length - 1}
                containerRef={containerRef}
              />
            ))}
          </Timeline>
        </div>
      ) : (
        <div className="text-center py-12 relative z-10">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No moments recorded</h3>
          <p className="text-sm text-muted-foreground">This was a quiet day without tracked activities.</p>
        </div>
      )}

      {/* Lazy Share Modal */}
      <LazyShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        afterglow={afterglow}
      />

      {/* Navigation */}
      <div className="pt-8 border-t relative z-10">
        <Link 
          to="/archive" 
          className="inline-flex items-center text-sm text-primary hover:underline transition-colors"
        >
          ← Back to Archive
        </Link>
      </div>
    </div>
  );
}