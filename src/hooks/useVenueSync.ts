import { useFieldData } from '@/components/screens/field/FieldDataProvider';

export function useVenueSync() {
  const fieldData = useFieldData();
  
  return {
    isLoading: fieldData.loading,
    venueCount: fieldData.nearbyVenues?.length ?? 0,
  };
}