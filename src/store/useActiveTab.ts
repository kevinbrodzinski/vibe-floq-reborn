import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type FloqTab = "field" | "floqs" | "pulse" | "vibe" | "afterglow" | "plan";

const routeToTab = (path: string): FloqTab =>
  (path.split('/')[1] as FloqTab) || 'field';

interface ActiveTabStore {
  tab: FloqTab
  /** set tab *and* push to history if needed */
  setTab: (t: FloqTab, push?: boolean) => void
  /** re-read `location.pathname` and sync store (for popstate) */
  syncWithLocation: () => void
}

export const useActiveTab = create<ActiveTabStore>()(
  persist(
    (set) => ({
      tab: routeToTab(window.location.pathname),
      setTab: (t, push = true) => {
        set({ tab: t });
        if (push && window.location.pathname !== `/${t}`) {
          window.history.pushState({}, '', `/${t}`);
        }
      },
      syncWithLocation: () =>
        set({ tab: routeToTab(window.location.pathname) }),
    }),
    { 
      name: 'vfo-active-tab',
      storage: createJSONStorage(() => localStorage)
    }
  )
)