// Browser-compatible EventEmitter replacement
class EventBridge {
  private listeners: Map<string, Array<(data?: any) => void>>;
  private maxListeners: number;

  constructor() {
    this.listeners = new Map();
    this.maxListeners = 100;
  }

  setMaxListeners(n: number): void {
    this.maxListeners = n;
  }

  // Type-safe emit with namespaced events
  emit<T = any>(event: string, data?: T): boolean {
    if (import.meta.env.DEV) {
      console.debug(`[EventBridge] ${event}`, data);
    }
    
    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.length === 0) return false;
    
    eventListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`[EventBridge] Error in listener for ${event}:`, error);
      }
    });
    
    return true;
  }

  // Type-safe listener with automatic cleanup tracking
  on<T = any>(event: string, listener: (data?: T) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    
    const eventListeners = this.listeners.get(event)!;
    if (eventListeners.length >= this.maxListeners) {
      console.warn(`[EventBridge] Max listeners (${this.maxListeners}) exceeded for event: ${event}`);
    }
    
    eventListeners.push(listener);
    return this;
  }

  // One-time listener
  once<T = any>(event: string, listener: (data?: T) => void): this {
    const wrappedListener = (data?: T) => {
      listener(data);
      this.off(event, wrappedListener);
    };
    return this.on(event, wrappedListener);
  }

  // Remove specific listener
  off<T = any>(event: string, listener: (data?: T) => void): this {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners) return this;
    
    const index = eventListeners.indexOf(listener);
    if (index > -1) {
      eventListeners.splice(index, 1);
      if (eventListeners.length === 0) {
        this.listeners.delete(event);
      }
    }
    
    return this;
  }

  // Remove all listeners for an event
  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  // Get listener count for debugging
  getListenerCount(event: string): number {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.length : 0;
  }

  // Emit to window for legacy compatibility
  emitToWindow<T = any>(event: string, data?: T): void {
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  // Listen to window events and bridge them
  bridgeWindowEvent(windowEvent: string, bridgeEvent?: string): () => void {
    const targetEvent = bridgeEvent || windowEvent;
    
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      this.emit(targetEvent, detail);
    };

    window.addEventListener(windowEvent, handler);
    
    return () => window.removeEventListener(windowEvent, handler);
  }
}

// Singleton instance
export const eventBridge = new EventBridge();

/** Optional HMR cleanup hook; currently a no-op. */
export function cleanupEventBridge() { /* no-op, kept for symmetry */ }

// Event namespace constants for type safety
export const Events = {
  // UI Navigation
  UI_MAP_FLY_TO: 'ui:map:flyTo',
  UI_MAP_PULSE: 'ui:map:pulse',
  UI_NAV_DEST: 'ui:nav:dest',
  UI_VENUE_SELECT: 'ui:venue:select',
  UI_OPEN_DIRECTIONS: 'ui:open:directions',

  // Flow & Venue UI fallbacks
  UI_VENUE_JOIN: 'ui:venue:join',
  UI_VENUE_SAVE: 'ui:venue:save',
  UI_VENUE_PLAN: 'ui:venue:plan',
  
  // Layer toggles
  FLOQ_LAYER_TOGGLE: 'floq:layer:toggle',
  FLOQ_LAYER_SET: 'floq:layer:set',
  
  // Rally System
  FLOQ_RALLY_START: 'floq:rally:start',
  FLOQ_RALLY_CREATED: 'floq:rally:created',
  FLOQ_RALLY_INBOX_NEW: 'floq:rally:inbox:new',
  FLOQ_RALLY_INBOX_OPEN: 'ui:rallyInbox:open',
  FLOQ_RALLY_INBOX_CLOSE: 'ui:rallyInbox:close',
  FLOQ_RALLY_INBOX_THREAD: 'ui:rallyInbox:openThread',
  
  // Flow System (new) - replaces breadcrumb
  FLOQ_FLOW_SHOW: 'floq:flow:show',
  FLOQ_FLOW_HIDE: 'floq:flow:hide',
  FLOQ_FLOW_RETRACE: 'floq:flow:retrace',
  FLOQ_FLOW_RETRACE_GOTO: 'floq:flow:retrace:goto',
  FLOQ_FLOW_START_REQUEST: 'floq:flow:startRequest',
  
  // Breadcrumb System (legacy - use Flow events instead)
  FLOQ_BREADCRUMB_SHOW: 'floq:breadcrumb:show',
  FLOQ_BREADCRUMB_HIDE: 'floq:breadcrumb:hide',
  FLOQ_BREADCRUMB_RETRACE: 'floq:breadcrumb:retrace',
  
  // Convergence System
  FLOQ_CONVERGENCE_DETECTED: 'floq:convergence:detected',
  FLOQ_CONVERGENCE_RALLY_CREATE: 'floq:convergence:rallyCreate',
  RALLY_CREATE_REQUEST: 'floq:rally:createRequest',
  
  // Social & Presence
  FLOQ_PRESENCE_UPDATE: 'floq:presence:update',
  FLOQ_FRIEND_MOVE: 'floq:friend:move',
  
  // Heat/Timeline
  FLOQ_HEAT_TOGGLE: 'floq:heatline:toggle',
  FLOQ_HEAT_SET: 'floq:heatline:set',
  FLOQ_OPEN_CONVERGENCE: 'floq:open-convergence',
  
  // Converge System
  FLOQ_CONVERGE_REQUEST: 'converge:request',
  FLOQ_CONVERGE_ACCEPT: 'converge:accept',
  FLOQ_CONVERGE_REJECT: 'converge:reject',
} as const;

// Type definitions for common event payloads
export interface EventPayloads {
  [Events.UI_MAP_FLY_TO]: { lng: number; lat: number; zoom?: number; duration?: number };
  [Events.UI_MAP_PULSE]: { lng: number; lat: number; color?: string; duration?: number };
  [Events.UI_NAV_DEST]: { lng: number; lat: number; duration?: number };
  [Events.UI_VENUE_SELECT]: { venueId: string };
  [Events.UI_OPEN_DIRECTIONS]: { to: { lat: number; lng: number; name?: string }; mode?: 'transit'|'walk'|'bike'|'drive' };

  // Flow & Venue UI fallbacks
  [Events.UI_VENUE_JOIN]: { venueId: string };
  [Events.UI_VENUE_SAVE]: { venueId: string };
  [Events.UI_VENUE_PLAN]: { venueId: string };

  // Layer toggles
  [Events.FLOQ_LAYER_TOGGLE]: { id: 'flow-route'|'predicted-meet'|'breadcrumb-trail'; enabled?: boolean };
  [Events.FLOQ_LAYER_SET]: { id: 'flow-route'|'predicted-meet'|'breadcrumb-trail'; enabled: boolean };
  
  [Events.FLOQ_RALLY_START]: { 
    rallyId: string; 
    participants: string[]; 
    centroid?: { lng: number; lat: number } | null; 
    source?: string 
  };
  [Events.FLOQ_RALLY_CREATED]: { rallyId: string };
  [Events.FLOQ_RALLY_INBOX_NEW]: { 
    threadId: string; 
    rallyId: string; 
    participants: string[]; 
    title: string 
  };
  [Events.FLOQ_RALLY_INBOX_THREAD]: { threadId: string };
  
  // Flow System events (new)
  [Events.FLOQ_FLOW_SHOW]: { 
    path?: Array<{ id: string; position: [number, number]; venueName?: string; color?: string }>; 
    mode?: 'retrace' | 'display' 
  };
  [Events.FLOQ_FLOW_HIDE]: {};
  [Events.FLOQ_FLOW_RETRACE]: { fromPoint?: string };
  [Events.FLOQ_FLOW_RETRACE_GOTO]: { index: number };
  [Events.FLOQ_FLOW_START_REQUEST]: { venueId?: string };
  
  // Breadcrumb System events (legacy)
  [Events.FLOQ_BREADCRUMB_SHOW]: { 
    path: Array<{ id: string; position: [number, number]; venueName?: string }>; 
    mode: 'retrace' | 'display' 
  };
  [Events.FLOQ_BREADCRUMB_HIDE]: {};
  [Events.FLOQ_BREADCRUMB_RETRACE]: { fromPoint?: string };
  
  [Events.FLOQ_CONVERGENCE_DETECTED]: {
    friendId: string;
    friendName: string;
    probability: number;
    timeToMeet: number;
    // Future-state hooks:
    //  - venueId/venueName let a resolver map to a vibe
    //  - vibeKey is your canonical vibe label (e.g. 'social', 'chill', 'high-energy')
    //  - vibeHex is a direct hex override (takes precedence)
    predictedLocation: {
      lat: number;
      lng: number;
      venueId?: string;
      venueName?: string;
      vibeKey?: string;
      vibeHex?: string;
    };
    confidence: number;
    agentIds?: string[];
  };
  
  [Events.RALLY_CREATE_REQUEST]: {
    location: { lat: number; lng: number; venueName?: string };
    invitees: string[];
    message?: string;
    autoExpire?: number;
    type?: 'convergence' | 'manual';
  };
  
  [Events.FLOQ_PRESENCE_UPDATE]: { 
    profileId: string; 
    position: [number, number]; 
    timestamp: number 
  };
  [Events.FLOQ_FRIEND_MOVE]: { 
    friendId: string; 
    position: [number, number]; 
    velocity?: [number, number] 
  };
  
  // Generic layer toggle payloads (updated for specific layer types)
  [Events.FLOQ_LAYER_TOGGLE]: { 
    id: 'predicted-meet' | 'flow-route' | 'breadcrumb-trail'; 
    enabled?: boolean 
  };
  [Events.FLOQ_LAYER_SET]: { 
    id: 'predicted-meet' | 'flow-route' | 'breadcrumb-trail'; 
    enabled: boolean 
  };
  
  // Converge System
  [Events.FLOQ_CONVERGE_REQUEST]: {
    point: { lat: number; lng: number; name?: string; id?: string };
    fromId?: string;
    toId?: string;
  };
  [Events.FLOQ_CONVERGE_ACCEPT]: {
    to: { lat: number; lng: number; name?: string };
    requestId?: string;
  };
  [Events.FLOQ_CONVERGE_REJECT]: { requestId?: string };
}

// Typed helpers
export function emitEvent<K extends keyof EventPayloads>(
  event: K,
  payload: EventPayloads[K]
): void {
  eventBridge.emit(event as string, payload);
}

export function onEvent<K extends keyof EventPayloads>(
  event: K,
  listener: (payload: EventPayloads[K]) => void
): () => void {
  const handler = (p: unknown) => listener(p as EventPayloads[K]);
  eventBridge.on(event as string, handler);
  return () => eventBridge.off(event as string, handler);
}