import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

/**
 * Custom hook for localStorage with type safety and synchronization
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Initialize from storage
  useEffect(() => {
    const initValue = async () => {
      try {
        const item = await storage.getJSON<T>(key);
        if (item !== null) {
          setStoredValue(item);
        }
      } catch (error) {
        console.warn(`Error reading storage key "${key}":`, error);
      }
    };
    initValue();
  }, [key]);

  // Return a wrapped version of useState's setter function that persists the new value to storage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to storage (fire-and-forget with proper error handling)
      void storage.setJSON(key, valueToStore).catch(error => {
        console.error(`Error setting storage key "${key}":`, error);
      });
    } catch (error) {
      console.error(`Error setting storage key "${key}":`, error);
    }
  };

  // Listen for changes to this key from other tabs/windows (web only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing storage value for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}