import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from 'use-debounce';

interface UsernameValidation {
  isValid: boolean;
  isAvailable: boolean | null;
  isChecking: boolean;
  suggestions: string[];
  message: string;
}

export function useUsernameValidation(username: string) {
  const [debouncedUsername] = useDebounce(username.trim().toLowerCase(), 500);
  const [validation, setValidation] = useState<UsernameValidation>({
    isValid: false,
    isAvailable: null,
    isChecking: false,
    suggestions: [],
    message: ''
  });

  const generateSuggestions = (baseUsername: string): string[] => {
    const suggestions = [];
    const cleanBase = baseUsername.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    
    // Add numbers
    suggestions.push(`${cleanBase}${Math.floor(Math.random() * 999) + 1}`);
    suggestions.push(`${cleanBase}${Math.floor(Math.random() * 99) + 1}`);
    
    // Add common suffixes
    const suffixes = ['_floq', '_vibe', '_user', '2024'];
    suffixes.forEach(suffix => {
      suggestions.push(`${cleanBase}${suffix}`);
    });
    
    // Add prefixes
    const prefixes = ['hey_', 'the_', 'real_'];
    prefixes.forEach(prefix => {
      suggestions.push(`${prefix}${cleanBase}`);
    });
    
    return suggestions.slice(0, 4); // Return top 4 suggestions
  };

  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) {
      setValidation({
        isValid: false,
        isAvailable: null,
        isChecking: false,
        suggestions: [],
        message: debouncedUsername.length > 0 ? 'Username must be at least 3 characters' : ''
      });
      return;
    }

    // Validate format - match database constraint
    if (!/^[A-Za-z0-9_.-]+$/.test(debouncedUsername)) {
      setValidation({
        isValid: false,
        isAvailable: false,
        isChecking: false,
        suggestions: [],
        message: 'Username can only contain letters, numbers, dots, dashes, and underscores'
      });
      return;
    }

    setValidation(prev => ({ ...prev, isChecking: true }));

    const checkAvailability = async () => {
      try {
        const { data: isAvailable, error } = await supabase
          .rpc('username_available', { u: debouncedUsername });

        if (error) throw error;

        if (isAvailable) {
          setValidation({
            isValid: true,
            isAvailable: true,
            isChecking: false,
            suggestions: [],
            message: '✓ Username is available'
          });
        } else {
          const suggestions = generateSuggestions(debouncedUsername);
          setValidation({
            isValid: false,
            isAvailable: false,
            isChecking: false,
            suggestions,
            message: 'Username is taken. Try one of these:'
          });
        }
      } catch (error) {
        setValidation({
          isValid: false,
          isAvailable: false,
          isChecking: false,
          suggestions: [],
          message: 'Error checking username availability'
        });
      }
    };

    checkAvailability();
  }, [debouncedUsername]);

  return validation;
}