import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type VibeContext = 'solo' | 'floq' | 'venue' | 'rally' | 'plan';

export type VibeVector = {
  energy: number;      // 0-1
  social: number;      // 0-1
  stress: number;      // 0-1
  stamina: number;     // 0-1
  mood?: string;       // "hype", "chill", "focused", etc
};

export type VibeSample = {
  context: VibeContext;
  vec: VibeVector;
  floq_id?: string;
  venue_id?: string;
  rally_id?: string;
  features?: Record<string, any>;
  confidence?: number;
};

export function useVibeCapture() {
  return useMutation({
    mutationFn: async (sample: VibeSample) => {
      const { data, error } = await supabase.functions.invoke('wings-vibe-sample', {
        body: sample
      });

      if (error) {
        console.error('Vibe capture error:', error);
        throw error;
      }

      return data;
    },
    onError: (error) => {
      console.error('Failed to capture vibe sample:', error);
    },
    onSuccess: (data) => {
      console.log('Vibe sample captured successfully:', data);
    }
  });
}

// Helper function to create basic vibe vectors
export function createVibeVector({
  energy = 0.5,
  social = 0.5,
  stress = 0.3,
  stamina = 0.7,
  mood = "neutral"
}: Partial<VibeVector> & { mood?: string } = {}): VibeVector {
  return {
    energy: Math.max(0, Math.min(1, energy)),
    social: Math.max(0, Math.min(1, social)),
    stress: Math.max(0, Math.min(1, stress)),
    stamina: Math.max(0, Math.min(1, stamina)),
    mood
  };
}

// Example usage patterns:
// const { mutate: captureVibe } = useVibeCapture();

// Solo vibe sampling
// captureVibe({
//   context: 'solo',
//   vec: createVibeVector({ energy: 0.8, social: 0.2, mood: "focused" })
// });

// Floq vibe sampling  
// captureVibe({
//   context: 'floq',
//   floq_id: 'some-floq-id',
//   vec: createVibeVector({ energy: 0.9, social: 0.8, mood: "hype" }),
//   confidence: 0.85
// });