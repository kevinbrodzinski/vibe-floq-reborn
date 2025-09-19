// Tiny typed event bus for co-presence coordination (no deps). Works on RN + Web.
type CoPresenceEvents = {
  'halfway:open': { floqId?: string; categories?: string[] } | undefined;
  'rally:create': { meta?: any } | undefined;
};

type Handler<T> = (payload: T) => void;

class Bus<E extends Record<string, any>> {
  private m = new Map<keyof E, Set<Handler<any>>>();
  
  on<K extends keyof E>(type: K, cb: Handler<NonNullable<E[K]>>) {
    if (!this.m.has(type)) this.m.set(type, new Set());
    this.m.get(type)!.add(cb);
    return () => {
      this.m.get(type)!.delete(cb);
    };
  }
  
  emit<K extends keyof E>(type: K, payload: E[K]) {
    const set = this.m.get(type);
    if (!set) return;
    set.forEach((cb) => cb(payload));
  }
}

export const coPresenceBus = new Bus<CoPresenceEvents>();

// Optional helpers
export function openMeetHalfway(payload?: { floqId?: string; categories?: string[] }) {
  coPresenceBus.emit('halfway:open', payload);
}

export function createRally(payload?: { meta?: any }) {
  coPresenceBus.emit('rally:create', payload);
}