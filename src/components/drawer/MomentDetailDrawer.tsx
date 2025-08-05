import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { useMomentDrawer } from '@/state/momentDrawer';
import { Badge } from '@/components/ui/badge';
import { LocationChip } from '@/components/location/LocationChip';
import { format } from 'date-fns';

export function MomentDetailDrawer() {
  const { open, moment, close } = useMomentDrawer();

  if (!moment) return null;

  const {
    title,
    timestamp,
    description,
    metadata: { location, vibe, intensity, social_context } = {},
  } = moment;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent 
        className="max-h-[90dvh] overflow-y-auto"
        aria-labelledby="moment-detail-title"
      >
        <DialogHeader>
          <DialogTitle 
            id="moment-detail-title"
            tabIndex={-1}
          >
            {title}
          </DialogTitle>
          <DialogDescription>
            {format(new Date(timestamp), 'p')}
          </DialogDescription>
          <button
            onClick={close}
            aria-label="Close detail"
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </DialogHeader>

        {description && (
          <p className="mb-4 text-sm leading-relaxed">{description}</p>
        )}

        {/* Location */}
        {location && (
          <div className="mb-4">
            <LocationChip
              location={location}
              showDistance={true}
              interactive={true}
              onClick={() => {
                if (location.coordinates) {
                  const [lng, lat] = location.coordinates;
                  window.open(
                    `https://maps.google.com/?q=${lat},${lng}`,
                    '_blank',
                    'noopener,noreferrer',
                  );
                }
              }}
            />
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {vibe && <Badge>{vibe}</Badge>}
          {intensity !== undefined && (
            <Badge variant="secondary">{Math.round(intensity * 100)} %</Badge>
          )}
          {social_context?.floq_id && <Badge variant="outline">Floq</Badge>}
          {social_context?.activity_type && (
            <Badge variant="outline">{social_context.activity_type}</Badge>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}