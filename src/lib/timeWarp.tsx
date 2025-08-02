import { createContext, useContext, useState, ReactNode } from 'react';

interface TimeWarpContextType {
  t?: Date;
  set: (date?: Date) => void;
}

export const TimeWarpCtx = createContext<TimeWarpContextType>({
  set: () => {}
});

interface TimeWarpProviderProps {
  children: ReactNode;
}

export const TimeWarpProvider: React.FC<TimeWarpProviderProps> = ({ children }) => {
  const [t, set] = useState<Date>();   // undefined → LIVE

  return (
    <TimeWarpCtx.Provider value={{ t, set }}>
      {children}
    </TimeWarpCtx.Provider>
  );
};

export const useTimeWarp = () => useContext(TimeWarpCtx);