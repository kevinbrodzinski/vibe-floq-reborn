import React, { useState, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { AfterglowMoment } from '@/types/afterglow';
import { getMomentIcon, getColorFromHex, formatMomentType } from '@/constants/moments';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Users, 
  Clock, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  X 
} from 'lucide-react';

interface MomentDetailDrawerProps {
  moment: AfterglowMoment | null;
  isOpen: boolean;
  onClose: () => void;
  relatedMoments?: AfterglowMoment[];
  onHighlightMoment?: (momentId: string) => void;
}

interface EncounteredUser {
  profile_id: string;
  interaction_strength: number;
  shared_duration: number;
}

export const MomentDetailDrawer = memo(({ 
  moment, 
  isOpen, 
  onClose, 
  relatedMoments = [],
  onHighlightMoment 
}: MomentDetailDrawerProps) => {
  const [showRawData, setShowRawData] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const prefersReduced = usePrefersReducedMotion();

  if (!moment) return null;

  const IconComponent = getMomentIcon(moment.moment_type);
  const color = getColorFromHex(moment.color);
  const formattedType = formatMomentType(moment.moment_type);

  // Extract metadata safely
  const venueName = moment.metadata?.venue_name;
  const venueId = moment.metadata?.venue_id;
  const latitude = moment.metadata?.latitude;
  const longitude = moment.metadata?.longitude;
  const encounteredUsers = moment.metadata?.encountered_users as EncounteredUser[] | undefined;
  const vibe = moment.metadata?.vibe;
  const activityType = moment.metadata?.activity_type;

  const hasLocation = latitude && longitude;
  
  const handleVenueLink = () => {
    if (venueId) {
      // Push to afterglow archive filtered by venue
      window.location.href = `/afterglow?venue=${venueId}`;
    }
  };

  const Content = () => (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative">
        <div 
          className="h-20 rounded-lg"
          style={{ backgroundColor: moment.color || '#6b7280' }}
        />
        <div className="absolute -bottom-4 left-4">
          <div 
            className="p-3 rounded-full bg-background border-2 border-background"
            style={{ borderColor: moment.color || '#6b7280' }}
          >
            <IconComponent className="h-6 w-6" style={{ color: moment.color || '#6b7280' }} />
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(moment.timestamp), 'h:mm a')}
          </Badge>
          <Badge variant="outline">{formattedType}</Badge>
          {vibe && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
              {vibe}
            </Badge>
          )}
        </div>
        
        <h2 className="text-xl font-semibold">{moment.title}</h2>
        {moment.description && (
          <p className="text-muted-foreground">{moment.description}</p>
        )}
      </div>

      {/* Location */}
      {(venueName || hasLocation) && (
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </h3>
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            {venueName && (
              <div className="flex items-center justify-between">
                <span className="font-medium">{venueName}</span>
                {venueId && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleVenueLink}
                    className="gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    See other days
                  </Button>
                )}
              </div>
            )}
            {hasLocation && (
              <div className="text-sm text-muted-foreground">
                {latitude}, {longitude}
              </div>
            )}
          </div>
        </div>
      )}

      {/* People */}
      {encounteredUsers && encounteredUsers.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            People ({encounteredUsers.length})
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {encounteredUsers.map((user, index) => (
              <div 
                key={user.profile_id || index}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">User {user.profile_id?.slice(-6)}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.shared_duration}min together
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Strength</div>
                  <div className="text-sm font-medium">{user.interaction_strength}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Moments */}
      {relatedMoments.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">Related Moments ({relatedMoments.length})</h3>
          <div className="space-y-2">
            {relatedMoments.slice(0, 3).map((relatedMoment) => {
              const RelatedIcon = getMomentIcon(relatedMoment.moment_type);
              return (
                <div 
                  key={relatedMoment.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => onHighlightMoment?.(relatedMoment.id)}
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: relatedMoment.color || '#6b7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{relatedMoment.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(relatedMoment.timestamp), 'h:mm a')}
                    </div>
                  </div>
                  <RelatedIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Raw Data Inspector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Raw Data</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowRawData(!showRawData)}
            className="gap-1"
          >
            {showRawData ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showRawData ? 'Hide' : 'Show'}
          </Button>
        </div>
        
        <AnimatePresence>
          {showRawData && (
            <motion.details
              open
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: prefersReduced ? 0 : 0.2 }}
              className="bg-muted/30 rounded-lg overflow-hidden"
            >
              <summary className="p-3 cursor-pointer font-medium">
                Moment Metadata
              </summary>
              <pre className="p-3 pt-0 text-xs bg-muted/50 overflow-auto font-mono text-muted-foreground border-t">
                {JSON.stringify(moment, null, 2)}
              </pre>
            </motion.details>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  // Desktop: Side panel dialog
  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Moment Details
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <Content />
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile: Full-screen drawer
  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-between">
            Moment Details
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-4">
          <Content />
        </div>
      </DrawerContent>
    </Drawer>
  );
});

MomentDetailDrawer.displayName = 'MomentDetailDrawer';