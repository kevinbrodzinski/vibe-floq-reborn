declare global {
  interface DeviceMotionEvent {
    // iOS Safari
    requestPermission?: () => Promise<'granted' | 'denied'>;
  }
  
  interface Window {
    DEBUG_ENV?: boolean;
  }

  interface WindowEventMap {
    'floq:invite-nearby': CustomEvent<{
      nearbyCount: number;
      cohesion01: number;
      heads: Array<{ friend_id: string; friend_name?: string; lng: number; lat: number; t_head: string }>;
      source?: 'field-hud'|'reflection'|'constellation';
    }>;
    'floq:rally:start': CustomEvent<{
      rallyId: string;
      participants: string[];
      centroid?: { lng:number; lat:number } | null;
      source?: string;
    }>;
    'floq:rally:inbox:new': CustomEvent<{
      threadId: string;
      rallyId: string;
      participants: string[];
      title: string;
    }>;
  }
}
export {};