import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EventBannerProps {
  eventName: string;
  vibe?: string | null;
  onDismiss: () => void;
}

export const EventBanner = ({ eventName, vibe, onDismiss }: EventBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm mx-auto">
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              📍 {eventName}
            </p>
            {vibe && (
              <p className="text-xs text-muted-foreground capitalize">
                {vibe} vibes
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};