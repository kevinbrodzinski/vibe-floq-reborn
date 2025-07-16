import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

/* ---------- Types ---------- */
export interface AfterglowMoment {
  id: string;
  timestamp: string;
  moment_type: string;
  title: string;
  description?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface AfterglowDetail {
  afterglow: {
    id: string;
    date: string;
    energy_score: number;
    social_intensity: number;
    dominant_vibe: string;
    summary_text: string | null;
    total_venues: number;
    total_floqs: number;
    crossed_paths_count: number;
    vibe_path: string[];
    is_pinned: boolean;
    created_at: string;
    peak_vibe_time?: string;
    ai_summary?: string;
    ai_summary_generated_at?: string;
  };
  moments: AfterglowMoment[];
}

/* ---------- Helper ---------- */
export const fetchAfterglowDetail = async (
  afterglowId: string
): Promise<AfterglowDetail> => {
  const { data, error } = await supabase.rpc("get_afterglow_with_moments", {
    p_afterglow_id: afterglowId
  });

  if (error) throw error;

  return data as AfterglowDetail;
};

/* ---------- React-query hook ---------- */
export const useAfterglowDetail = (afterglowId?: string) =>
  useQuery<AfterglowDetail>({
    queryKey: ["afterglow-detail", afterglowId],
    queryFn: () => fetchAfterglowDetail(afterglowId!),
    enabled: Boolean(afterglowId)
  });