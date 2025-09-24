// Device location helper for Share Location functionality
// This can be wired into the Share Location button in a future PR

export async function getCurrentPosition(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute
      }
    );
  });
}

// Integration example for MomentaryFloqDetail:
// const location = await getCurrentPosition();
// if (location) {
//   await supabase.rpc('upsert_presence', {
//     p_lat: location.lat,
//     p_lng: location.lng,
//     p_vibe: currentVibe,
//     p_visibility: 'public'
//   });
// }