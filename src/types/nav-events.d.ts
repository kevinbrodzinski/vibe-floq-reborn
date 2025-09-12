// Augments WindowEventMap for our custom events
declare global {
  interface WindowEventMap {
    'ui:rallyInbox:open': CustomEvent<void>;
    'ui:rallyInbox:close': CustomEvent<void>;
    'ui:rallyInbox:openThread': CustomEvent<{ threadId: string }>;

    'ui:map:flyTo': CustomEvent<{ lng: number; lat: number; zoom?: number }>;
    'ui:nav:dest': CustomEvent<{ lng: number; lat: number; duration?: number }>;

    // already in your app, listed for reference:
    'floq:rally:start': CustomEvent<{
      rallyId: string;
      participants: string[];
      centroid?: { lng: number; lat: number } | null;
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