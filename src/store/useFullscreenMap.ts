import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Mode = 'map'   // normal
           | 'full' // map is 100% (sheet floats on top)
           | 'list' // sheet owns the screen, map collapses to mini-map

interface FullscreenSlice {
  mode: Mode
  set: (m: Mode) => void
  toggleFull: () => void           // map ↔ full
}

export const useFullscreenMap = create<FullscreenSlice>()(
  persist(
    (set, get) => ({
      mode: 'map',
      set: (m) => set({ mode: m }),
      toggleFull: () => set({ mode: get().mode === 'full' ? 'map' : 'full' }),
    }),
    { name: 'vfo-fullscreen-map' }
  )
)