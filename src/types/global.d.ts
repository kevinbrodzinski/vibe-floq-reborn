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
    };
  }
}
export {};