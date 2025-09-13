import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, MapPin, X } from 'lucide-react';
import { ConvergencePredictionEngine, type ConvergenceEvent } from '@/lib/trajectory/ConvergencePredictionEngine';
import { createRally } from '@/lib/api/rally';
import { createRallyInboxThread } from '@/lib/api/rallyInbox';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface ConvergenceToastProps {
  event: ConvergenceEvent;
  onStartRally: () => void;
  onDismiss: () => void;
  onSuppress: () => void;
}

function ConvergenceToast({ event, onStartRally, onDismiss, onSuppress }: ConvergenceToastProps) {
  const minutes = Math.ceil(event.timeToMeet / 60);
  const confidence = Math.round(event.probability * 100);
  
  const participants = event.participants
    .filter(id => id !== 'me')
    .map(id => id.includes('friend') ? `Friend ${id.split('-')[1]}` : 'Friend')
    .join(', ');

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="bg-card border border-border rounded-lg shadow-lg p-4 max-w-sm mx-auto mt-safe-top"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Convergence Detected</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0"
          aria-label="Dismiss notification"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          {event.type === 'group' 
            ? `You and ${participants} might meet up`
            : `You might cross paths with ${participants}`
          }
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>~{minutes} min</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{confidence}% likely</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <Button
          onClick={onStartRally}
          size="sm"
          className="flex-1 text-xs"
        >
          Start Rally
        </Button>
        <Button
          onClick={onSuppress}
          variant="ghost"
          size="sm"
          className="text-xs"
        >
          Not Now
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * System for managing convergence prediction notifications
 * Shows subtle notifications when friends are likely to cross paths
 */
export function ConvergenceNotificationSystem() {
  const [activeEvent, setActiveEvent] = useState<ConvergenceEvent | null>(null);
  const [suppressedEvents, setSuppressedEvents] = useState<Set<string>>(new Set());
  const [isCreatingRally, setIsCreatingRally] = useState(false);
  const { toast } = useToast();

  // Check for convergence events every 10 seconds
  useEffect(() => {
    const checkConvergences = () => {
      const events = ConvergencePredictionEngine.detectUpcomingConvergences();
      
      // Find the best event that hasn't been suppressed
      const candidateEvent = events.find(event => 
        !suppressedEvents.has(event.id) && 
        event.timeToMeet <= 180 && // 3 minutes max
        event.probability >= 0.75
      );

      if (candidateEvent && (!activeEvent || candidateEvent.id !== activeEvent.id)) {
        setActiveEvent(candidateEvent);
      } else if (!candidateEvent && activeEvent) {
        setActiveEvent(null);
      }
    };

    checkConvergences();
    const interval = setInterval(checkConvergences, 10000);
    
    return () => clearInterval(interval);
  }, [suppressedEvents, activeEvent]);

  // Auto-dismiss expired events
  useEffect(() => {
    if (!activeEvent) return;

    const timeoutId = setTimeout(() => {
      setActiveEvent(null);
    }, activeEvent.timeToMeet * 1000);

    return () => clearTimeout(timeoutId);
  }, [activeEvent]);

  const handleStartRally = async () => {
    if (!activeEvent || isCreatingRally) return;

    setIsCreatingRally(true);
    try {
      const center = activeEvent.meetingPoint;
      
      // Create rally at predicted meeting point
      const { rallyId } = await createRally({
        center,
        recipients: [], // Empty for now - could include friend IDs if available
        ttlMin: 60,
        note: `Convergence rally - ${Math.ceil(activeEvent.timeToMeet / 60)} min prediction`
      });

      // Create inbox thread
      const { threadId } = await createRallyInboxThread({
        rallyId,
        title: 'Convergence Rally',
        participants: [],
        centroid: center
      });

      // Fly to meeting point and pulse
      window.dispatchEvent(new CustomEvent('ui:map:flyTo', { 
        detail: { ...center, zoom: 16 } 
      }));
      window.dispatchEvent(new CustomEvent('ui:nav:dest', { 
        detail: { ...center, duration: 1200 } 
      }));

      // Fire inbox event
      window.dispatchEvent(new CustomEvent('floq:rally:inbox:new', {
        detail: { threadId, rallyId, participants: [], title: 'Convergence Rally' }
      }));

      toast({ 
        title: 'Rally created at convergence point', 
        description: `Meeting in ~${Math.ceil(activeEvent.timeToMeet / 60)} minutes` 
      });

      setActiveEvent(null);
    } catch (error: any) {
      toast({ 
        title: 'Could not create rally', 
        description: error?.message ?? 'Try again', 
        variant: 'destructive' 
      });
    } finally {
      setIsCreatingRally(false);
    }
  };

  const handleDismiss = () => {
    setActiveEvent(null);
  };

  const handleSuppress = () => {
    if (activeEvent) {
      setSuppressedEvents(prev => new Set([...prev, activeEvent.id]));
      setActiveEvent(null);
    }
  };

  // Clear suppressed events periodically
  useEffect(() => {
    const cleanup = () => {
      setSuppressedEvents(new Set());
    };

    const timeout = setTimeout(cleanup, 30 * 60 * 1000); // 30 minutes
    return () => clearTimeout(timeout);
  }, [suppressedEvents]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[650] pointer-events-none">
      <div className="pointer-events-auto">
        <AnimatePresence>
          {activeEvent && (
            <ConvergenceToast
              event={activeEvent}
              onStartRally={handleStartRally}
              onDismiss={handleDismiss}
              onSuppress={handleSuppress}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}