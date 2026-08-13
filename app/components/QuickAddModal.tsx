'use client';

import React, { useEffect } from 'react';
import { ActiveTab } from '../lib/types';
import { triggerHaptic } from '../lib/haptics';
import { useSettings } from '../contexts/SettingsContext';
import { Shirt, Sparkles, Luggage, ChevronRight, X } from './AppIcon';

interface QuickAddModalProps {
  onClose: () => void;
  onSelectAction: (tab: ActiveTab) => void;
  onOpenLogWear?: () => void;
}

export default function QuickAddModal({ onClose, onSelectAction, onOpenLogWear }: QuickAddModalProps) {
  const { t } = useSettings();
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

  const handleLogWear = () => {
    triggerHaptic(12);
    if (onOpenLogWear) {
      onOpenLogWear();
    }
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
          <h3 className="quick-add-title">{t('quickActions')}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="quick-add-grid">
          <button
            className="quick-add-card"
            onClick={handleLogWear}
          >
            <div className="quick-add-card__icon-bg log-wear" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.15)' }}>
              <Sparkles size={22} color="#3b82f6" />
            </div>
            <div className="quick-add-card__content">
              <span className="quick-add-card__title">{t('logWear')}</span>
              <span className="quick-add-card__sub">{t('logWearDesc')}</span>
            </div>
            <span className="quick-add-card__arrow"><ChevronRight size={18} /></span>
          </button>

          <button
            className="quick-add-card"
            onClick={() => handleAction('add')}
          >
            <div className="quick-add-card__icon-bg add-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shirt size={22} color="#6366f1" />
            </div>
            <div className="quick-add-card__content">
              <span className="quick-add-card__title">{t('addClothingItem')}</span>
              <span className="quick-add-card__sub">{t('addItemQuickDesc')}</span>
            </div>
            <span className="quick-add-card__arrow"><ChevronRight size={18} /></span>
          </button>

          <button
            className="quick-add-card"
            onClick={() => handleAction('outfits')}
          >
            <div className="quick-add-card__icon-bg build-outfit" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={22} color="#ec4899" />
            </div>
            <div className="quick-add-card__content">
              <span className="quick-add-card__title">{t('createOutfit')}</span>
              <span className="quick-add-card__sub">{t('createOutfitDesc')}</span>
            </div>
            <span className="quick-add-card__arrow"><ChevronRight size={18} /></span>
          </button>

          <button
            className="quick-add-card"
            onClick={() => handleAction('trips')}
          >
            <div className="quick-add-card__icon-bg plan-trip" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Luggage size={22} color="#10b981" />
            </div>
            <div className="quick-add-card__content">
              <span className="quick-add-card__title">{t('planTrip')}</span>
              <span className="quick-add-card__sub">{t('planTripDesc')}</span>
            </div>
            <span className="quick-add-card__arrow"><ChevronRight size={18} /></span>
          </button>
        </div>
      </div>
    </div>
  );
}
