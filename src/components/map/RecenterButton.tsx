import React from 'react';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { recenterAndHighlight } from '@/lib/map/overlays/userAuraHighlight';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

interface RecenterButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  children?: React.ReactNode;
}

export function RecenterButton({ 
  className,
  variant = 'outline',
  size = 'icon',
  children 
}: RecenterButtonProps) {
  const handleRecenter = async () => {
    const map = getCurrentMap();
    if (!map) {
      console.warn('Map not available for recenter');
      return;
    }

    // Trigger the elegant aura highlight
    await recenterAndHighlight(map, {
      durationMs: 1100,
      easeMs: 450,
      innerBumpPx: 10,
      outerBumpPx: 16,
      alphaBoost: 0.25,
      keepZoom: false,
    });

    // Also emit the custom event for any other listeners
    window.dispatchEvent(new CustomEvent('floq:geolocate'));
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRecenter}
      className={className}
      aria-label="Recenter map on my location"
    >
      {children || <MapPin className="h-4 w-4" />}
    </Button>
  );
}