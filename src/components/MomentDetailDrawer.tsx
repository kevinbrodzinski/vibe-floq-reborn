import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMomentDrawer } from '@/state/momentDrawer';
import { Badge } from '@/components/ui/badge';
import { formatMomentTime } from '@/utils/afterglowHelpers';
import { LocationChip } from '@/components/location/LocationChip';

export function MomentDetailDrawer() {
  const { open, moment, close } = useMomentDrawer();

  if (!moment) return null;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{moment.title}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {formatMomentTime(moment.timestamp)}
              </p>
            </div>
          </div>
        </DialogHeader>

        {moment.description && (
          <p className="text-muted-foreground mb-4">{moment.description}</p>
        )}

        {/* Enhanced metadata display */}
        {moment.metadata && Object.keys(moment.metadata).length > 0 && (
          <div className="space-y-4">
            {/* Location information */}
            {moment.metadata.location && (
              <div className="flex items-center gap-2">
                <LocationChip 
                  location={moment.metadata.location}
                  size="sm"
                  showDistance={!!moment.metadata.location.distance_from_previous}
                  interactive={!!moment.metadata.location.coordinates}
                  onClick={() => {
                    if (moment.metadata.location?.coordinates) {
                      const [lng, lat] = moment.metadata.location.coordinates;
                      window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank', 'noopener,noreferrer');
                    }
                  }}
                />
              </div>
            )}

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2">
              {moment.metadata.vibe && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {moment.metadata.vibe}
                </Badge>
              )}
              {moment.metadata.social_context?.floq_id && (
                <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/20">
                  Floq
                </Badge>
              )}
              {moment.metadata.social_context?.activity_type && (
                <Badge variant="outline" className="text-xs bg-secondary/10 text-secondary border-secondary/20">
                  {moment.metadata.social_context.activity_type}
                </Badge>
              )}
              {moment.metadata.intensity && (
                <Badge variant="outline" className="text-xs">
                  {Math.round(moment.metadata.intensity * 100)}% intensity
                </Badge>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}