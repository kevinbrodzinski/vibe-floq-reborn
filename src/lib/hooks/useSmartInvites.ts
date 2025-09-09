import { useMemo, useState, useEffect } from 'react';
import { generateInviteOptions, type GenerateOptionsInput } from '@/lib/social/inviteEngine';
import { decorateWithVenue, type DecorateInput } from '@/lib/social/inviteVenueDecorator';
import { listVenueFavorites, toggleVenueFavorite } from '@/lib/api/venueFavorites';

export function useSmartInvites(
  baseInput: GenerateOptionsInput,
  venueInput?: Omit<DecorateInput, 'options'>
) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Load favorites on mount
  useEffect(() => {
    listVenueFavorites().then(setFavoriteIds).catch(() => {});
  }, []);

  const handleToggleFavorite = async (venueId: string, next: boolean) => {
    // Optimistic update
    setFavoriteIds(prev => {
      const n = new Set(prev);
      next ? n.add(venueId) : n.delete(venueId);
      return n;
    });
    
    try {
      await toggleVenueFavorite(venueId, next);
    } catch {
      // Revert on failure
      setFavoriteIds(prev => {
        const n = new Set(prev);
        next ? n.delete(venueId) : n.add(venueId);
        return n;
      });
    }
  };

  const invites = useMemo(() => {
    // Generate base invite options
    const baseOptions = generateInviteOptions(baseInput);
    
    // Decorate with venues if available
    if (venueInput?.venues?.length && venueInput.zones?.length) {
      return decorateWithVenue({
        ...venueInput,
        options: baseOptions
      });
    }
    
    return baseOptions;
  }, [baseInput, venueInput]);

  return {
    invites,
    favoriteIds,
    onToggleFavorite: handleToggleFavorite
  };
}

/* --------------------------------- Usage ------------------------------------
import { useSmartInvites } from '@/lib/hooks/useSmartInvites'

// In a component:
const { invites, favoriteIds, onToggleFavorite } = useSmartInvites(
  { tensor, context, limit: 4 },
  { zones: convergenceZones, venues: nearbyVenues }
)
// -> returns { invites: InviteOption[], favoriteIds: Set<string>, onToggleFavorite: (id, next) => Promise<void> }

// Then use favoriteIds and onToggleFavorite with VenueChooserPanel:
<VenueChooserPanel
  option={selectedOption}
  venues={venues}
  focus={zone?.centroid}
  favoriteIds={favoriteIds}
  onToggleFavorite={onToggleFavorite}
  onSelect={(venue) => applyVenue(selectedOption, venue)}
/>
-----------------------------------------------------------------------------*/