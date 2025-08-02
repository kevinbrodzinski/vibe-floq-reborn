import { createContext, useContext, useState, ReactNode } from 'react'

// Time warp context for debugging/development
interface TimeWarpContextType {
  t: Date | undefined
  set: (time: Date | undefined) => void
}

const TimeWarpContext = createContext<TimeWarpContextType | undefined>(undefined)

export const TimeWarpProvider = ({ children }: { children: ReactNode }) => {
  const [t, setT] = useState<Date | undefined>(undefined)

  const set = (newTime: Date | undefined) => {
    setT(newTime)
  }

  return (
    <TimeWarpContext.Provider value={{ t, set }}>
      {children}
    </TimeWarpContext.Provider>
  )
}

export const useTimeWarp = (): TimeWarpContextType => {
  const context = useContext(TimeWarpContext)
  if (!context) {
    throw new Error('useTimeWarp must be used within a TimeWarpProvider')
  }
  return context
}

// Helper to get current warped time
export const getWarpedTime = (): Date => {
  return new Date() // Will use context value when properly integrated
}