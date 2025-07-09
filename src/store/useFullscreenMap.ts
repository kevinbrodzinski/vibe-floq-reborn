import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type Mode = 'map' | 'full' | 'list'

interface FullscreenMapStore {
  mode: Mode
  set: (m: Mode) => void
  /** map ↔ full */
  toggleFull: () => void
  /** map ↔ list */
  toggleList: () => void
}

export const useFullscreenMap = create<FullscreenMapStore>()(
  persist(
    (set, get) => ({
      mode: 'map',
      set: (m) => set({ mode: m }),
      toggleFull: () =>
        set({ mode: get().mode === 'full' ? 'map' : 'full' }),
      toggleList: () =>
        set({ mode: get().mode === 'list' ? 'map' : 'list' }),
    }),
    { 
      name: 'vfo-fullscreen-map',
      storage: createJSONStorage(() => localStorage)
    }
  )
)