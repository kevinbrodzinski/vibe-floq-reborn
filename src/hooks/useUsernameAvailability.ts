import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export const useUsernameAvailability = (username: string) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const debouncedUsername = useDebounce(username.trim().toLowerCase(), 300);

  const checkAvailability = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setIsAvailable(null);
      setError(null);
      return;
    }

    // Validate format
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(usernameToCheck)) {
      setIsAvailable(false);
      setError('Invalid format. Use 3-32 characters: letters, numbers, underscore only');
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      // Check if username is available using the secure RPC function
      const { data: usernameAvailable, error: usernameError } = await supabase
        .rpc('username_available', { p_username: usernameToCheck });

      if (usernameError) throw usernameError;

      // Check if username is reserved
      const { data: reservedData, error: reservedError } = await supabase
        .from('reserved_usernames')
        .select('name')
        .ilike('name', usernameToCheck)
        .limit(1);

      if (reservedError) throw reservedError;

      const isReserved = reservedData && reservedData.length > 0;
      const isUsernameAvailable = (usernameAvailable ?? false) && !isReserved;
      setIsAvailable(isUsernameAvailable);

      if (import.meta.env.DEV) {
        console.log(`Username "${usernameToCheck}" availability:`, {
          available: isUsernameAvailable,
          usernameAvailable: usernameAvailable,
          reservedNames: reservedData?.length || 0
        });
      }
    } catch (err) {
      setError('Failed to check username availability');
      setIsAvailable(false);
      if (import.meta.env.DEV) {
        console.error('Username availability check failed:', err);
      }
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAvailability(debouncedUsername);
  }, [debouncedUsername, checkAvailability]);

  const getValidationMessage = () => {
    if (!username.trim()) return 'Enter a username to check availability';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
      return 'Use only letters, numbers, and underscores (3-32 characters)';
    }
    if (isChecking) return 'Checking availability...';
    if (error) return error;
    if (isAvailable === true) return `@${username.toLowerCase()} is available!`;
    if (isAvailable === false) return 'Username is already taken';
    return '';
  };

  const getValidationState = (): 'idle' | 'checking' | 'available' | 'taken' | 'invalid' => {
    if (!username.trim() || username.length < 3) return 'idle';
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) return 'invalid';
    if (isChecking) return 'checking';
    if (error || isAvailable === false) return 'taken';
    if (isAvailable === true) return 'available';
    return 'idle';
  };

  return {
    isChecking,
    isAvailable,
    error,
    validationMessage: getValidationMessage(),
    validationState: getValidationState(),
    recheckAvailability: () => checkAvailability(username.trim().toLowerCase())
  };
};