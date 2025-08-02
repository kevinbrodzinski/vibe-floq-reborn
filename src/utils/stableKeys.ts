// Utility functions for generating stable React keys across components

export interface NearbyPerson {
  profile_id?: string | null;
  synthetic_id?: string;
  vibe: string;
  meters: number;
}

/**
 * Generates a stable, unique key for a person in a React list
 * @param person - The person object 
 * @param componentPrefix - Unique prefix for the component (e.g., 'carousel', 'drawer')
 * @param index - Fallback array index if no unique identifier is available
 * @returns A stable React key that won't collide across components
 */
export function generateStableKey(
  person: NearbyPerson, 
  componentPrefix: string, 
  index: number
): string {
  // Use synthetic_id if available (includes both real profile IDs and demo user hashes)
  if (person.synthetic_id) {
    return `${componentPrefix}-${person.synthetic_id}`;
  }
  
  // Fallback to profile_id if available
  if (person.profile_id) {
    return `${componentPrefix}-${person.profile_id}`;
  }
  
  // Final fallback: create a unique key using component prefix and array index
  return `${componentPrefix}-anon-${person.vibe}-${person.meters}-${index}`;
}