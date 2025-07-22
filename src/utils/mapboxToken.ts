// Mapbox token management for cross-platform support
export const getMapboxToken = async (): Promise<string> => {
  // For Supabase-connected projects, fetch from edge function secrets
  try {
    const response = await fetch('/api/mapbox-token');
    if (response.ok) {
      const { token } = await response.json();
      return token;
    }
  } catch (error) {
    console.warn('Failed to fetch Mapbox token from backend:', error);
  }

  // Fallback to environment variable
  const envToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 
                   process.env.MAPBOX_ACCESS_TOKEN;
  
  if (envToken) {
    return envToken;
  }

  // Use Mapbox's default public token for development
  return 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
};

// Initialize token on module load
let mapboxToken: string | null = null;
getMapboxToken().then(token => {
  mapboxToken = token;
});

export const getMapboxTokenSync = (): string => {
  return mapboxToken || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
};