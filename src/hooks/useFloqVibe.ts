import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FloqVibeFrame = {
  joint_energy: number; // 0..1
  harmony: number;      // 0..1
  tension: number;      // 0..1
  frame_start: string;
  frame_end: string;
};

export function useFloqVibe(floqId: string) {
  return useQuery({
    queryKey: ["floq-vibe", floqId],
    enabled: !!floqId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vibe_frames_floq")
        .select("joint_energy,harmony,tension,frame_start,frame_end")
        .eq("floq_id", floqId)
        .order("frame_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? {
        joint_energy: 0.5, harmony: 0.5, tension: 0.2, frame_start: "", frame_end: ""
      }) as FloqVibeFrame;
    }
  });
}

/** Map vibe → two brand colors + glow strength */
export function vibeToColors(v: { joint_energy: number; harmony: number }) {
  const e = clamp(v.joint_energy, 0, 1);
  const h = clamp(v.harmony, 0, 1);

  // Hue: energy → cyan (low) → violet (high)
  const hueA = lerp(190, 270, e); // cyan → violet
  const hueB = lerp(200, 300, e * 0.85 + 0.15);

  // Saturation/alpha: harmony raises saturation, low harmony = softer/warmer shift
  const sat = Math.round(lerp(55, 85, h));
  const a1  = 0.35 + 0.35 * h;   // outer aura strength
  const a2  = 0.25 + 0.30 * h;

  return {
    colorA: `hsl(${hueA} ${sat}% 60%)`,
    colorB: `hsl(${hueB} ${sat}% 58%)`,
    glowA: `hsla(${hueA} ${sat}% 60% / ${a1})`,
    glowB: `hsla(${hueB} ${sat}% 58% / ${a2})`,
    titleShadow: `0 0 18px hsla(${hueB} ${sat}% 58% / .45), 0 0 36px hsla(${hueA} ${sat}% 60% / .35)`
  };
}

const clamp = (n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const lerp  = (a:number,b:number,t:number)=>a+(b-a)*t;