import { EventEmitter } from 'events';

// Centralized event bus for type-safe cross-component communication
class EventBridge extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Support many concurrent listeners
  }

  // Type-safe emit with namespaced events
  emit<T = any>(event: string, data?: T): boolean {
    if (import.meta.env.DEV) {
      console.debug(`[EventBridge] ${event}`, data);
    }
    return super.emit(event, data);
  }

  // Type-safe listener with automatic cleanup tracking
  on<T = any>(event: string, listener: (data?: T) => void): this {
    return super.on(event, listener);
  }

  // One-time listener
  once<T = any>(event: string, listener: (data?: T) => void): this {
    return super.once(event, listener);
  }

  // Remove specific listener
  off<T = any>(event: string, listener: (data?: T) => void): this {
    return super.off(event, listener);
  }

  // Remove all listeners for an event
  removeAllListeners(event?: string): this {
    return super.removeAllListeners(event);
  }

  // Get listener count for debugging
  getListenerCount(event: string): number {
    return this.listenerCount(event);
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

// Event namespace constants for type safety
export const Events = {
  // UI Navigation
  UI_MAP_FLY_TO: 'ui:map:flyTo',
  UI_MAP_PULSE: 'ui:map:pulse',
  UI_NAV_DEST: 'ui:nav:dest',
  UI_VENUE_SELECT: 'ui:venue:select',
  
  // Rally System
  FLOQ_RALLY_START: 'floq:rally:start',
  FLOQ_RALLY_CREATED: 'floq:rally:created',
  FLOQ_RALLY_INBOX_NEW: 'floq:rally:inbox:new',
  FLOQ_RALLY_INBOX_OPEN: 'ui:rallyInbox:open',
  FLOQ_RALLY_INBOX_CLOSE: 'ui:rallyInbox:close',
  FLOQ_RALLY_INBOX_THREAD: 'ui:rallyInbox:openThread',
  
  // Breadcrumb System
  FLOQ_BREADCRUMB_SHOW: 'floq:breadcrumb:show',
  FLOQ_BREADCRUMB_HIDE: 'floq:breadcrumb:hide',
  FLOQ_BREADCRUMB_RETRACE: 'floq:breadcrumb:retrace',
  
  // Convergence System
  FLOQ_CONVERGENCE_DETECTED: 'floq:convergence:detected',
  FLOQ_CONVERGENCE_RALLY_CREATE: 'floq:convergence:rallyCreate',
  
  // Social & Presence
  FLOQ_PRESENCE_UPDATE: 'floq:presence:update',
  FLOQ_FRIEND_MOVE: 'floq:friend:move',
  
  // Heat/Timeline
  FLOQ_HEAT_TOGGLE: 'floq:heatline:toggle',
  FLOQ_HEAT_SET: 'floq:heatline:set',
  FLOQ_OPEN_CONVERGENCE: 'floq:open-convergence',
} as const;

// Type definitions for common event payloads
export interface EventPayloads {
  [Events.UI_MAP_FLY_TO]: { lng: number; lat: number; zoom?: number; duration?: number };
  [Events.UI_MAP_PULSE]: { lng: number; lat: number; color?: string; duration?: number };
  [Events.UI_NAV_DEST]: { lng: number; lat: number; duration?: number };
  [Events.UI_VENUE_SELECT]: { venueId: string };
  
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
  
  [Events.FLOQ_BREADCRUMB_SHOW]: { 
    path: Array<{ id: string; position: [number, number]; venueName?: string }>; 
    mode: 'retrace' | 'display' 
  };
  [Events.FLOQ_BREADCRUMB_RETRACE]: { fromPoint?: string };
  
  [Events.FLOQ_CONVERGENCE_DETECTED]: {
    friendId: string;
    friendName: string;
    probability: number;
    timeToMeet: number;
    predictedLocation: { lat: number; lng: number; venueName?: string };
    confidence: number;
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
}

// Typed emit helper
export function emitEvent<K extends keyof EventPayloads>(
  event: K,
  payload: EventPayloads[K]
): void {
  eventBridge.emit(event, payload);
}

// Typed listener helper
export function onEvent<K extends keyof EventPayloads>(
  event: K,
  listener: (payload: EventPayloads[K]) => void
): () => void {
  eventBridge.on(event, listener);
  return () => eventBridge.off(event, listener);
}