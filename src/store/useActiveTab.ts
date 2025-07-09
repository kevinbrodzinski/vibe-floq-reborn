import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type FloqTab = "field" | "floqs" | "pulse" | "vibe" | "afterglow" | "plan";

interface ActiveTabStore {
  tab: FloqTab
  setTab: (t: FloqTab) => void
}

export const useActiveTab = create<ActiveTabStore>()(
  persist(
    (set) => ({
      tab: 'field', // Default to field instead of plan
      setTab: (t) => set({ tab: t }),
    }),
    { 
      name: 'vfo-active-tab',
      storage: createJSONStorage(() => localStorage)
    }
  )
)