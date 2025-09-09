import { useMemo } from 'react';
import { generateInviteOptions, type GenerateOptionsInput } from '@/lib/social/inviteEngine';
import { decorateWithVenue, type DecorateInput } from '@/lib/social/inviteVenueDecorator';

export function useSmartInvites(
  baseInput: GenerateOptionsInput,
  venueInput?: Omit<DecorateInput, 'options'>
) {
  return useMemo(() => {
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
}

/* --------------------------------- Usage ------------------------------------
import { useSmartInvites } from '@/lib/hooks/useSmartInvites'

// In a component:
const smartInvites = useSmartInvites(
  { tensor, context, limit: 4 },
  { zones: convergenceZones, venues: nearbyVenues }
)
// -> returns InviteOption[] with venue decorations
-----------------------------------------------------------------------------*/