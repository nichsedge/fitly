'use client';

import React, { useEffect } from 'react';
import { ActiveTab } from '../lib/types';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useOutfits } from '../contexts/OutfitContext';
import { useTrips } from '../contexts/TripContext';
import { useSettings } from '../contexts/SettingsContext';
import { triggerHaptic } from '../lib/haptics';

interface MoreMenuModalProps {
  activeTab: ActiveTab;
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
}

export default function MoreMenuModal({ activeTab, onClose, onSelectTab, onOpenSettings }: MoreMenuModalProps) {
  const { items } = useWardrobe();
  const { outfits } = useOutfits();
  const { trips } = useTrips();
  const { t } = useSettings();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelect = (tab: ActiveTab) => {
    triggerHaptic(10);
    onSelectTab(tab);
    onClose();
  };

  const totalItems = items.length;
  const totalOutfits = outfits.length;
  const totalTrips = trips.length;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100 }}>
      <div 
        className="more-menu-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" />

        <div className="more-menu-header">
          <div>
            <h3 className="more-menu-title">More Features</h3>
            <p className="more-menu-sub">Planning, trips, analytics & settings</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Quick Stats Banner */}
        <div className="more-stats-strip">
          <div className="more-stat-item">
            <span className="more-stat-val">{totalItems}</span>
            <span className="more-stat-lbl">Items</span>
          </div>
          <div className="more-stat-divider" />
          <div className="more-stat-item">
            <span className="more-stat-val">{totalOutfits}</span>
            <span className="more-stat-lbl">Outfits</span>
          </div>
          <div className="more-stat-divider" />
          <div className="more-stat-item">
            <span className="more-stat-val">{totalTrips}</span>
            <span className="more-stat-lbl">Trips</span>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="more-nav-grid">
          <button 
            className={`more-nav-card ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => handleSelect('calendar')}
          >
            <div className="more-nav-card__icon calendar-bg">📅</div>
            <div className="more-nav-card__info">
              <span className="more-nav-card__title">{t('calendar')}</span>
              <span className="more-nav-card__desc">Daily wear history & planner</span>
            </div>
            {activeTab === 'calendar' && <span className="more-nav-card__badge">Active</span>}
          </button>

          <button 
            className={`more-nav-card ${activeTab === 'trips' ? 'active' : ''}`}
            onClick={() => handleSelect('trips')}
          >
            <div className="more-nav-card__icon trips-bg">🧳</div>
            <div className="more-nav-card__info">
              <span className="more-nav-card__title">{t('trips')}</span>
              <span className="more-nav-card__desc">Packing lists & travel planning</span>
            </div>
            {activeTab === 'trips' && <span className="more-nav-card__badge">Active</span>}
          </button>

          <button 
            className={`more-nav-card ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => handleSelect('insights')}
          >
            <div className="more-nav-card__icon insights-bg">📊</div>
            <div className="more-nav-card__info">
              <span className="more-nav-card__title">{t('stats')}</span>
              <span className="more-nav-card__desc">Cost per wear & closet statistics</span>
            </div>
            {activeTab === 'insights' && <span className="more-nav-card__badge">Active</span>}
          </button>
        </div>

        {/* Footer actions */}
        <div className="more-menu-footer">
          <button 
            className="more-footer-btn"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
          >
            <span>⚙️ {t('settings')}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
