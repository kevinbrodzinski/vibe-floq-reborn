// src/store/useVibeDetection.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type VibeDetectionState = {
  autoMode: boolean
  setAutoMode: (val: boolean) => void
  toggleAutoMode: () => void
}

export const useVibeDetection = create<VibeDetectionState>()(
  persist(
    (set) => ({
      autoMode: false,
      setAutoMode: (val) => set({ autoMode: val }),
      toggleAutoMode: () => set((s) => ({ autoMode: !s.autoMode })),
    }),
    {
      name: 'vibe-detection', // localStorage or MMKV
    }
  )
)