import { supabase } from "@/integrations/supabase/client";

export async function fetchPlaceDetails(placeId: string) {
  const { data, error } = await supabase.functions.invoke("get_place_details", {
    body: { place_id: placeId },
  });
  if (error) throw error;
  return data;
}