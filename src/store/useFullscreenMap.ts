
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
      setMode: (mode) => {
        console.log('Setting fullscreen mode to:', mode)
        set({ mode })
      },
      toggleFull: () =>
        set((state) => {
          const next = state.mode === 'full' ? (state.prevMode ?? 'map') : 'full'
          console.log('Toggling full mode from', state.mode, 'to', next)
          return { 
            prevMode: state.mode === 'full' ? undefined : state.mode, 
            mode: next 
          }
        }),
      toggleList: () =>
        set((state) => {
          const next = state.mode === 'list' ? 'map' : 'list'
          console.log('Toggling list mode from', state.mode, 'to', next)
          return {
            prevMode: undefined,
            mode: next
          }
        }),
    }),
    { 
      name: 'vfo-fullscreen-map',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        console.log('Fullscreen map store hydrated:', state?.mode)
        if (state) {
          state._hasHydrated = true
        }
      }
    }
  )
)
