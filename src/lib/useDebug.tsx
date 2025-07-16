import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react';

type Ctx = [boolean, Dispatch<SetStateAction<boolean>>];
const DebugCtx = createContext<Ctx>([false, () => {}]);

export const DebugProvider = ({ children }: { children: ReactNode }) => {
  const prod = import.meta.env.MODE === 'production';
  
  // Safer initialization of debug state
  const [debug, setDebug] = useState<boolean>(() => {
    try {
      return !prod && typeof localStorage !== 'undefined' && localStorage.getItem('showDebug') === 'true';
    } catch {
      return false;
    }
  });

  /* persist */
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('showDebug', String(debug));
      }
    } catch {
      // localStorage not available or blocked
    }
  }, [debug]);

  /* ⌥+D shortcut (dev only) */
  useEffect(() => {
    if (prod) return;
    const h = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'd') setDebug(v => !v);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [prod, setDebug]);

  return (
    <DebugCtx.Provider value={[debug, setDebug]}>
      {children}
    </DebugCtx.Provider>
  );
};

export const useDebug = () => useContext(DebugCtx);