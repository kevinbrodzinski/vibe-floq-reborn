import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Clock, MapPin, ChevronRight } from 'lucide-react';
import { useBreadcrumbTrail } from '@/hooks/useBreadcrumbTrail';
import { Chip } from '@/components/ui/Chip';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RetracePathChipProps {
  className?: string;
}

/**
 * Chip that appears in venue sheets when user has visited multiple venues
 * Allows retracing recent path with navigation to each venue
 */
export function RetracePathChip({ className }: RetracePathChipProps) {
  const [showPath, setShowPath] = useState(false);
  const { getRetraceVenues, getPathStats, canRetrace, currentPath } = useBreadcrumbTrail();

  if (!canRetrace || !currentPath) return null;

  const retraceVenues = getRetraceVenues();
  const stats = getPathStats();

  const handleOpenPath = () => {
    setShowPath(true);
  };

  const handleNavigateToVenue = (venue: any) => {
    // Fly to venue on map
    window.dispatchEvent(new CustomEvent('ui:map:flyTo', {
      detail: { lat: venue.lat, lng: venue.lng, zoom: 16 }
    }));
    
    // Pulse venue location
    window.dispatchEvent(new CustomEvent('ui:nav:dest', {
      detail: { lat: venue.lat, lng: venue.lng, duration: 1200 }
    }));

    setShowPath(false);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <>
      <Chip
        onClick={handleOpenPath}
        icon={<RotateCcw className="h-3 w-3" />}
        color="slate"
        className={cn("shrink-0", className)}
        type="button"
        aria-label={`Retrace your path through ${retraceVenues.length} recent venues`}
      >
        Retrace Path ({retraceVenues.length})
      </Chip>

      <Sheet open={showPath} onOpenChange={setShowPath}>
        <SheetContent 
          side="bottom" 
          className="h-[70vh] overflow-y-auto"
          aria-label="Recent venue path"
        >
          <SheetHeader className="space-y-2">
            <SheetTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Your Recent Path
            </SheetTitle>
            <SheetDescription>
              {stats && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{stats.venueCount} venues</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(stats.totalDuration)}</span>
                  </div>
                </div>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-2">
            {retraceVenues.map((venue, index) => (
              <motion.div
                key={venue.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        {index === 0 ? 'Most Recent' : `${index + 1}`}
                      </span>
                      <h4 className="font-medium truncate">{venue.name}</h4>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Visited: {formatTime(venue.visitedAt)}</span>
                      {venue.duration && (
                        <span>Duration: {formatDuration(venue.duration)}</span>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleNavigateToVenue(venue)}
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-8 w-8 p-0"
                    aria-label={`Navigate to ${venue.name}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Path is automatically tracked for 15 minutes after each venue visit
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}