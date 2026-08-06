'use client';

import { useState } from 'react';

/**
 * A custom React hook that maintains state in sync with localStorage.
 * It persists state across unmounts/remounts and page navigation.
 */
export function usePersistentState<T extends string>(
  key: string,
  defaultValue: T,
  validValues?: readonly T[]
): [T, (newValue: T) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
          if (!validValues || (validValues as readonly string[]).includes(saved)) {
            return saved as T;
          }
        }
      } catch (err) {
        console.error(`Failed to read key "${key}" from localStorage:`, err);
      }
    }
    return defaultValue;
  });

  const setPersistentState = (newValue: T) => {
    setState(newValue);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, newValue);
      } catch (err) {
        console.error(`Failed to set key "${key}" in localStorage:`, err);
      }
    }
  };

  return [state, setPersistentState];
}
