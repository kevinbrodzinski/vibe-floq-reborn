// Z-index constants for consistent layering across the application
export const zIndex = {
  // Base layers
  base: 0,
  background: 1,
  
  // Content layers
  content: 10,
  card: 20,
  modal: 101,
  
  // Overlay layers
  overlay: 100,
  dropdown: 110,
  tooltip: 120,
  
  // Top layers
  header: 200,
  navigation: 210,
  floating: 220,
  
  // Maximum layers
  max: 9999,
} as const;

export type ZIndex = typeof zIndex[keyof typeof zIndex]; 