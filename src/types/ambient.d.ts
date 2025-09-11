// Global custom event typing
declare global {
  interface WindowEventMap {
    'floq:open-convergence': CustomEvent<{
      lng: number; 
      lat: number; 
      groupMin: number; 
      prob: number; 
      etaMin: number;
      tMs?: number; 
      source?: 'reflection-peak' | 'story' | 'chips' | 'other';
    }>;
    'floq:heatline:toggle': CustomEvent<{ on: boolean }>;
    'floq:heatline:set': CustomEvent<{ 
      edges: Array<{ 
        from: { lng: number; lat: number }; 
        to: { lng: number; lat: number }; 
        weight: number; 
        venueId?: string 
      }> 
    }>;
  }
}

export {};