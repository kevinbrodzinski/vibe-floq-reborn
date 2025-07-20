
import { useState, useEffect } from 'react';

// Memory fallback for when localStorage fails
let memoryFallback: Record<string, string> = {};

export const useSafeStorage = () => {
  const getItem = async (key: string): Promise<string | null> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return memoryFallback[key] ?? null;
    } catch (err) {
      console.warn('[Storage] Fallback for key:', key);
      return memoryFallback[key] ?? null;
    }
  };

  const setItem = async (key: string, value: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      } else {
        memoryFallback[key] = value;
      }
    } catch {
      memoryFallback[key] = value;
    }
  };

  const removeItem = async (key: string): Promise<void> => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      } else {
        delete memoryFallback[key];
      }
    } catch {
      delete memoryFallback[key];
    }
  };

  return { getItem, setItem, removeItem };
};
