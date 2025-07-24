import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react';
import { storage } from '@/lib/storage';

type Ctx = [boolean, Dispatch<SetStateAction<boolean>>];
const DebugCtx = createContext<Ctx>([false, () => {}]);

export const DebugProvider = ({ children }: { children: ReactNode }) => {
  const prod = import.meta.env.MODE === 'production';
  
  // Safer initialization of debug state
  const [debug, setDebug] = useState<boolean>(false);
  
  // Load debug state on mount
  useEffect(() => {
    if (prod) return;
    storage.getItem('showDebug').then(stored => {
      setDebug(stored === 'true');
    }).catch(() => setDebug(false));
  }, [prod]);

  /* persist */
  useEffect(() => {
    if (!prod) {
      storage.setItem('showDebug', String(debug)).catch(console.error);
    }
  }, [debug, prod]);

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