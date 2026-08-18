'use client';

import React, { useEffect } from 'react';
import { ActiveTab } from '../lib/types';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useOutfits } from '../contexts/OutfitContext';
import { useTrips } from '../contexts/TripContext';
import { useSettings } from '../contexts/SettingsContext';
import { triggerHaptic } from '../lib/haptics';
import { Calendar, Luggage, BarChart3, Settings, ChevronRight, X, Sparkles } from './AppIcon';

interface MoreMenuModalProps {
  activeTab: ActiveTab;
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onOpenMinimalism?: () => void;
}

export default function MoreMenuModal({ activeTab, onClose, onSelectTab, onOpenSettings, onOpenMinimalism }: MoreMenuModalProps) {
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
            <h3 className="more-menu-title">{t('moreFeatures')}</h3>
            <p className="more-menu-sub">{t('moreFeaturesDesc')}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Quick Stats Banner */}
        <div className="more-stats-strip">
          <div className="more-stat-item">
            <span className="more-stat-val">{totalItems}</span>
            <span className="more-stat-lbl">{t('itemsCount')}</span>
          </div>
          <div className="more-stat-divider" />
          <div className="more-stat-item">
            <span className="more-stat-val">{totalOutfits}</span>
            <span className="more-stat-lbl">{t('outfitsCount')}</span>
          </div>
          <div className="more-stat-divider" />
          <div className="more-stat-item">
            <span className="more-stat-val">{totalTrips}</span>
            <span className="more-stat-lbl">{t('tripsCount')}</span>
          </div>
        </div>

        {/* Navigation Grid */}
        <div className="more-nav-grid">
          <button
            className={`more-nav-card ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => handleSelect('calendar')}
          >
            <div className="more-nav-card__icon calendar-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={22} color="#6366f1" />
            </div>
            <div className="more-nav-card__info">
              <span className="more-nav-card__title">{t('calendar')}</span>
              <span className="more-nav-card__desc">{t('calendarDesc')}</span>
            </div>
            {activeTab === 'calendar' && <span className="more-nav-card__badge">{t('active')}</span>}
          </button>

          <button
            className={`more-nav-card ${activeTab === 'trips' ? 'active' : ''}`}
            onClick={() => handleSelect('trips')}
          >
            <div className="more-nav-card__icon trips-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Luggage size={22} color="#10b981" />
            </div>
            <div className="more-nav-card__info">
              <span className="more-nav-card__title">{t('trips')}</span>
              <span className="more-nav-card__desc">{t('tripsDesc')}</span>
            </div>
            {activeTab === 'trips' && <span className="more-nav-card__badge">{t('active')}</span>}
          </button>

          <button
            className={`more-nav-card ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => handleSelect('insights')}
          >
            <div className="more-nav-card__icon insights-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={22} color="#ec4899" />
            </div>
            <div className="more-nav-card__info">
              <span className="more-nav-card__title">{t('stats')}</span>
              <span className="more-nav-card__desc">{t('statsDesc')}</span>
            </div>
            {activeTab === 'insights' && <span className="more-nav-card__badge">{t('active')}</span>}
          </button>

          <button
            className="more-nav-card"
            onClick={() => {
              triggerHaptic(10);
              onClose();
              onOpenMinimalism?.();
            }}
          >
            <div className="more-nav-card__icon" style={{ background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={22} color="#ec4899" />
            </div>
            <div className="more-nav-card__info">
              <span className="more-nav-card__title" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {t('minimalismAnalyzerShort')} <span style={{ fontSize: 10, background: 'rgba(236, 72, 153, 0.2)', color: '#ec4899', padding: '1px 6px', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>KonMari</span>
              </span>
              <span className="more-nav-card__desc">{t('minimalismDesc')}</span>
            </div>
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
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={18} />
              <span>{t('settings')}</span>
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
