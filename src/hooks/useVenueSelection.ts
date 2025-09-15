import { useEffect, useState } from 'react';

export function useVenueSelection() {
  const [selected, setSelected] = useState<any | null>(null);
  
  useEffect(() => {
    const onSelect = (e: any) => setSelected(e.detail);
    window.addEventListener('venues:select', onSelect as any);
    return () => window.removeEventListener('venues:select', onSelect as any);
  }, []);
  
  return { 
    selected, 
    clear: () => setSelected(null) 
  };
}