'use client';

import { useEffect, useState } from 'react';

interface Props {
  message: string;
  onDone?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export default function Toast({ message, onDone, actionLabel, onAction }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!visible) return null;

  return (
    <div className={`toast ${actionLabel ? 'toast--action' : ''}`} role="status" aria-live="polite">
      <span className="toast__message">{message}</span>
      {actionLabel && onAction && (
        <button
          className="toast__action"
          onClick={() => {
            onAction();
            setVisible(false);
            onDone?.();
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}