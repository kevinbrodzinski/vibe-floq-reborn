import { useEffect, useState } from 'react';

export function useGuestSession() {
  const [guestName, setGuestName] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('floq_guest_name');
    if (stored) setGuestName(stored);
  }, []);

  const saveGuestName = (name: string) => {
    localStorage.setItem('floq_guest_name', name);
    setGuestName(name);
  };

  const clearGuestSession = () => {
    localStorage.removeItem('floq_guest_name');
    setGuestName(null);
  };

  return { guestName, saveGuestName, clearGuestSession };
}