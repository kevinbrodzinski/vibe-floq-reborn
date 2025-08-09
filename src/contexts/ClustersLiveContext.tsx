import React, { createContext, useContext, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Unsubscribe = () => void;

interface ClustersLiveAPI {
  ensureSubscription: (key: string, onUpdate: () => void) => Unsubscribe;
}

const ClustersLiveContext = createContext<ClustersLiveAPI | null>(null);

export const ClustersLiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Track active channels by key
  const channelsRef = useRef<Map<string, { refCount: number; channel: ReturnType<typeof supabase.channel>; callbacks: Set<() => void> }>>(new Map());

  const api = useMemo<ClustersLiveAPI>(() => ({
    ensureSubscription: (key: string, onUpdate: () => void) => {
      const existing = channelsRef.current.get(key);
      if (existing) {
        existing.refCount += 1;
        existing.callbacks.add(onUpdate);
        return () => {
          existing.callbacks.delete(onUpdate);
          existing.refCount -= 1;
          if (existing.refCount <= 0) {
            supabase.removeChannel(existing.channel);
            channelsRef.current.delete(key);
          }
        };
      }

      const channel = supabase
        .channel(`clusters-${key}`)
        .on('broadcast', { event: 'clusters_updated' }, () => {
          const entry = channelsRef.current.get(key);
          if (!entry) return;
          entry.callbacks.forEach(cb => {
            try { cb(); } catch {}
          });
        })
        .subscribe();

      channelsRef.current.set(key, { refCount: 1, channel, callbacks: new Set([onUpdate]) });

      return () => {
        const entry = channelsRef.current.get(key);
        if (!entry) return;
        entry.callbacks.delete(onUpdate);
        entry.refCount -= 1;
        if (entry.refCount <= 0) {
          supabase.removeChannel(entry.channel);
          channelsRef.current.delete(key);
        }
      };
    }
  }), []);

  return (
    <ClustersLiveContext.Provider value={api}>{children}</ClustersLiveContext.Provider>
  );
};

export const useClustersLiveBus = (): ClustersLiveAPI => {
  const ctx = useContext(ClustersLiveContext);
  if (!ctx) throw new Error('useClustersLiveBus must be used within ClustersLiveProvider');
  return ctx;
};