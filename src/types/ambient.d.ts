// Global custom event typing
declare global {
  interface WindowEventMap {
    'floq:open-convergence': CustomEvent<{
      lng: number; 
      lat: number; 
      groupMin: number; 
      prob: number; 
      etaMin: number;
    }>;
  }
}

export {};