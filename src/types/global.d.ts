declare global {
  interface Window {
    floq?: {
      nearbyVenues?: Array<{
        id?: string | number;
        pid?: string | number;
        name?: string;
        lat?: number;
        lng?: number;
        category?: string;
        open_now?: boolean;
        openNow?: boolean;
        crowd?: number;
      }>;
      myLocation?: { lng: number; lat: number };
      friendsIndex?: Record<
        string,
        {
          lngLat?: { lng: number; lat: number };
          energy01?: number;
          direction?: 'up' | 'down' | 'flat';
          name?: string;
          venue?: {
            id?: string;
            name?: string;
            lat?: number;
            lng?: number;
            category?: string;
            openNow?: boolean;
          };
        }
      >;
    };
  }
}
export {};