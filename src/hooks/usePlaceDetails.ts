import { useQuery } from "@tanstack/react-query";
import { fetchPlaceDetails } from "@/integrations/google/places";
import { PlaceDetailsSchema } from "@/types/places";

export const usePlaceDetails = (placeId: string | null) =>
  useQuery({
    queryKey: ["place-details", placeId],
    enabled: !!placeId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!placeId) return null;
      const data = await fetchPlaceDetails(placeId);
      return PlaceDetailsSchema.parse(data);
    }
  });