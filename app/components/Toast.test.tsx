import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Toast from './Toast';

describe('Toast', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the message with a polite status role', () => {
    render(<Toast message="Saved!" />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('Saved!');
  });

  it('auto-dismisses after 2 seconds and calls onDone', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    render(<Toast message="Saved!" onDone={onDone} />);

    expect(screen.getByRole('status')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByRole('status')).toBeNull();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('renders nothing once dismissed', () => {
    vi.useFakeTimers();
    render(<Toast message="Bye" />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
