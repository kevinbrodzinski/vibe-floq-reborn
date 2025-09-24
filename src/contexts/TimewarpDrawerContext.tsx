import { createContext, useContext, useState, ReactNode } from 'react';

export interface TimewarpState {
  isPlaying: boolean;
  currentIndex: number;
  speed: number; // 1x, 2x, 4x, 8x
  totalFrames: number;
  isActive: boolean; // Whether timewarp mode is active
}

interface TimewarpDrawerContextType {
  open: boolean;
  toggle: () => void;
  close: () => void;
  timewarpState: TimewarpState;
  setTimewarpState: (state: Partial<TimewarpState>) => void;
  resetTimewarp: () => void;
}

const defaultTimewarpState: TimewarpState = {
  isPlaying: false,
  currentIndex: 0,
  speed: 1,
  totalFrames: 0,
  isActive: false,
};

const TimewarpDrawerCtx = createContext<TimewarpDrawerContextType>({
  open: false,
  toggle: () => {},
  close: () => {},
  timewarpState: defaultTimewarpState,
  setTimewarpState: () => {},
  resetTimewarp: () => {},
});

export const TimewarpDrawerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [timewarpState, setTimewarpStateInternal] = useState<TimewarpState>(defaultTimewarpState);

  const toggle = () => setOpen(o => !o);
  const close = () => setOpen(false);

  const setTimewarpState = (newState: Partial<TimewarpState>) => {
    setTimewarpStateInternal(prev => ({ ...prev, ...newState }));
  };

  const resetTimewarp = () => {
    setTimewarpStateInternal(defaultTimewarpState);
  };

  return (
    <TimewarpDrawerCtx.Provider
      value={{
        open,
        toggle,
        close,
        timewarpState,
        setTimewarpState,
        resetTimewarp,
      }}
    >
      {children}
    </TimewarpDrawerCtx.Provider>
  );
};

export const useTimewarpDrawer = () => useContext(TimewarpDrawerCtx);