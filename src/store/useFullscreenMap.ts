import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type FullMode = 'map' | 'full' | 'list'

interface FullscreenMapStore {
  mode: FullMode
  setMode: (m: FullMode) => void
  /** map ↔ full */
  toggleFull: () => void
  /** map ↔ list */
  toggleList: () => void
}

export const useFullscreenMap = create<FullscreenMapStore>()(
  persist(
    (set, get) => ({
      mode: 'map',
      setMode: (mode) => set({ mode }),
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