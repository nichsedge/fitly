import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';

describe('usePersistentState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with defaultValue when localStorage is empty', () => {
    const { result } = renderHook(() =>
      usePersistentState('test_key', 'default_val')
    );
    expect(result.current[0]).toBe('default_val');
  });

  it('initializes from localStorage if a valid value is present', () => {
    localStorage.setItem('test_key', 'saved_val');
    const { result } = renderHook(() =>
      usePersistentState('test_key', 'default_val')
    );
    expect(result.current[0]).toBe('saved_val');
  });

  it('falls back to defaultValue if stored value is not in validValues', () => {
    localStorage.setItem('test_key', 'invalid_option');
    const { result } = renderHook(() =>
      usePersistentState('test_key', 'default_val', ['opt1', 'opt2'])
    );
    expect(result.current[0]).toBe('default_val');
  });

  it('updates state and persists to localStorage when setter is called', () => {
    const { result } = renderHook(() =>
      usePersistentState('test_key', 'default_val', ['default_val', 'new_val'])
    );

    act(() => {
      result.current[1]('new_val');
    });

    expect(result.current[0]).toBe('new_val');
    expect(localStorage.getItem('test_key')).toBe('new_val');
  });
});
