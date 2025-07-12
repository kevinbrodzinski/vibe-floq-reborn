import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type FullMode = 'map' | 'full' | 'list'

interface FullscreenMapStore {
  mode: FullMode
  prevMode?: FullMode
  _hasHydrated?: boolean
  setMode: (m: FullMode) => void
  /** map ↔ full with mode memory */
  toggleFull: () => void
  /** map ↔ list */
  toggleList: () => void
}

export const useFullscreenMap = create<FullscreenMapStore>()(
  persist(
    (set, get) => ({
      mode: 'map',
      prevMode: undefined,
      _hasHydrated: false,
      setMode: (mode) => set({ mode }),
      toggleFull: () =>
        set((state) => {
          const next = state.mode === 'full' ? (state.prevMode ?? 'map') : 'full'
          return { 
            prevMode: state.mode === 'full' ? undefined : state.mode, 
            mode: next 
          }
        }),
      toggleList: () =>
        set((state) => ({
          prevMode: undefined,
          mode: state.mode === 'list' ? 'map' : 'list'
        })),
    }),
    { 
      name: 'vfo-fullscreen-map',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true
        }
      }
    }
  )
)