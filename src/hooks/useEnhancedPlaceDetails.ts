import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EnhancedPlaceDetailsSchema, type EnhancedPlaceDetails } from "@/types/venues";

export const useEnhancedPlaceDetails = (placeId: string | null) =>
  useQuery({
    queryKey: ["enhanced-place-details", placeId],
    enabled: !!placeId,
    staleTime: 10 * 60 * 1000, // 10 minutes - place details change rarely
    gcTime: 30 * 60 * 1000,    // 30 minutes cache time
    queryFn: async (): Promise<EnhancedPlaceDetails> => {
      if (!placeId) throw new Error("Place ID is required");
      
      const { data, error } = await supabase.functions.invoke("venue-detail", {
        body: { pid: placeId },
      });
      
      if (error) {
        console.error('Enhanced place details error:', error);
        throw error;
      }
      
      if (!data?.venue) {
        throw new Error("No venue data returned");
      }
      
      // Transform venue data to enhanced schema
      const transformedData = {
        id: data.venue.pid,
        displayName: { text: data.venue.name },
        formattedAddress: data.venue.address || '',
        types: data.venue.types || [],
        rating: data.venue.rating,
        userRatingCount: data.venue.user_ratings_total,
        googleMapsUri: `https://maps.google.com/?cid=${data.venue.pid}`,
        businessStatus: data.venue.business_status,
        priceLevel: data.venue.price,
        currentOpeningHours: data.venue.hours ? {
          openNow: data.venue.hours.open_now || false,
          periods: data.venue.hours.periods,
          weekdayDescriptions: data.venue.hours.weekday_text
        } : undefined,
        photos: data.venue.photos?.map((url: string, index: number) => ({
          name: url,
          widthPx: 1280,
          heightPx: 720,
          authorAttributions: []
        })) || [],
        location: data.venue.geometry ? {
          latitude: data.venue.geometry.location.lat,
          longitude: data.venue.geometry.location.lng
        } : undefined
      };
      
      return EnhancedPlaceDetailsSchema.parse(transformedData);
    },
    retry: (failureCount, error) => {
      // Don't retry on 404s
      if (error instanceof Error && error.message.includes('not found')) {
        return false;
      }
      return failureCount < 2;
    }
  });