import { useEffect, useState } from 'react';

export function useGuestSession() {
  const [guestName, setGuestName] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    const storedName = localStorage.getItem('floq_guest_name');
    const storedId = localStorage.getItem('guest_participant_id');
    
    if (storedName) setGuestName(storedName);
    if (storedId) setGuestId(storedId);
  }, []);

  const saveGuestSession = (participantId: string, name: string) => {
    localStorage.setItem('guest_participant_id', participantId);
    localStorage.setItem('floq_guest_name', name);
    setGuestId(participantId);
    setGuestName(name);
  };

  const clearGuestSession = () => {
    localStorage.removeItem('floq_guest_name');
    localStorage.removeItem('guest_participant_id');
    setGuestName(null);
    setGuestId(null);
  };

  const isGuest = !!guestId;

  return { 
    guestName, 
    guestId, 
    isGuest,
    setGuestName,
    saveGuestSession, 
    clearGuestSession 
  };
}