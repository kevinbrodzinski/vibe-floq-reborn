import { z } from "zod";

export const PlaceDetailsSchema = z.object({
  id: z.string(),
  displayName: z.object({ text: z.string() }),
  formattedAddress: z.string(),
  types: z.array(z.string()).optional(),
  rating: z.number().optional(),
  userRatingCount: z.number().optional(),
  googleMapsUri: z.string().optional()
});

export type PlaceDetails = z.infer<typeof PlaceDetailsSchema>;