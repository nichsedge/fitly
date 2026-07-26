'use client';

import React, { useEffect } from 'react';
import { ActiveTab } from '../lib/types';
import { triggerHaptic } from '../lib/haptics';

interface QuickAddModalProps {
  onClose: () => void;
  onSelectAction: (tab: ActiveTab) => void;
}

export default function QuickAddModal({ onClose, onSelectAction }: QuickAddModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAction = (tab: ActiveTab) => {
    triggerHaptic(12);
    onSelectAction(tab);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100 }} role="dialog" aria-modal="true" aria-label="Quick Actions">
      <div 
        className="quick-add-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" />

        <div className="quick-add-header">
          <h3 className="quick-add-title">Quick Actions</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="quick-add-grid">
          <button 
            className="quick-add-card"
            onClick={() => handleAction('add')}
          >
            <div className="quick-add-card__icon-bg add-item">
              👕
            </div>
            <div className="quick-add-card__content">
              <span className="quick-add-card__title">Add Clothing Item</span>
              <span className="quick-add-card__sub">Photo, details, category & location</span>
            </div>
            <span className="quick-add-card__arrow">→</span>
          </button>

          <button 
            className="quick-add-card"
            onClick={() => handleAction('outfits')}
          >
            <div className="quick-add-card__icon-bg build-outfit">
              ✨
            </div>
            <div className="quick-add-card__content">
              <span className="quick-add-card__title">Create Outfit</span>
              <span className="quick-add-card__sub">Mix & match clothes into looks</span>
            </div>
            <span className="quick-add-card__arrow">→</span>
          </button>

          <button 
            className="quick-add-card"
            onClick={() => handleAction('trips')}
          >
            <div className="quick-add-card__icon-bg plan-trip">
              🧳
            </div>
            <div className="quick-add-card__content">
              <span className="quick-add-card__title">Plan a Trip</span>
              <span className="quick-add-card__sub">Create packing list & outfit plans</span>
            </div>
            <span className="quick-add-card__arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
