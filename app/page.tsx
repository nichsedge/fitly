'use client';

import { useState } from 'react';
import { useApp } from './components/AppProvider';
import WardrobeView from './components/WardrobeView';
import OutfitsView from './components/OutfitsView';
import LaundryView from './components/LaundryView';
import AddItemView from './components/AddItemView';
import CalendarTab from './components/CalendarTab';
import InsightsSection from './components/InsightsSection';
import SettingsModal from './components/SettingsModal';
import { ActiveTab } from './lib/types';
import { triggerHaptic } from './lib/haptics';

export default function Home() {
  const { loading, theme, toggleTheme, isOffline, t, language, setLanguage } = useApp();
  const [activeTab, setActiveTab] = useState<ActiveTab>('wardrobe');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleTabChange = (tab: ActiveTab) => {
    triggerHaptic(8);
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__logo">
          <div className="app-header__logo-icon">🧥</div>
          <span className="app-header__title">Fitly</span>
          {isOffline && (
            <span style={{
              fontSize: 10,
              background: 'rgba(234, 179, 8, 0.2)',
              color: '#eab308',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              padding: '2px 8px',
              borderRadius: 12,
              fontWeight: 600,
              marginLeft: 6
            }}>
              ⚡ {t('offline')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Quick Language Switcher Pill */}
          <button
            onClick={() => {
              const nextLang = language === 'en' ? 'id' : 'en';
              setLanguage(nextLang);
              triggerHaptic(10);
            }}
            style={{
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-pill)',
              padding: '3px 9px',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            title="Switch Language / Ubah Bahasa"
          >
            {language === 'en' ? '🇮🇩 ID' : '🇬🇧 EN'}
          </button>

          <button 
            className="btn-circle" 
            onClick={() => { toggleTheme(); triggerHaptic(10); }}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
          <button 
            id="btn-settings"
            className="btn-circle" 
            onClick={() => { setIsSettingsOpen(true); triggerHaptic(10); }}
            aria-label="Settings"
            title="Settings & Storage"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'wardrobe' && <WardrobeView onNavigateToAdd={() => handleTabChange('add')} />}
        {activeTab === 'outfits' && <OutfitsView />}
        {activeTab === 'laundry' && <LaundryView />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'insights' && (
          <div className="page-content">
            <div className="section-header">
              <h2 className="section-title">{t('stats')}</h2>
            </div>
            <InsightsSection />
          </div>
        )}
        {activeTab === 'add' && <AddItemView onDone={() => handleTabChange('wardrobe')} />}
      </main>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <button
          id="nav-wardrobe"
          className={`nav-btn ${activeTab === 'wardrobe' ? 'active' : ''}`}
          onClick={() => handleTabChange('wardrobe')}
        >
          <span className="nav-btn__icon">👕</span>
          <span className="nav-btn__label">{t('wardrobe')}</span>
        </button>

        <button
          id="nav-outfits"
          className={`nav-btn ${activeTab === 'outfits' ? 'active' : ''}`}
          onClick={() => handleTabChange('outfits')}
        >
          <span className="nav-btn__icon">✨</span>
          <span className="nav-btn__label">{t('outfits')}</span>
        </button>

        <button
          id="nav-laundry"
          className={`nav-btn ${activeTab === 'laundry' ? 'active' : ''}`}
          onClick={() => handleTabChange('laundry')}
        >
          <span className="nav-btn__icon">🧺</span>
          <span className="nav-btn__label">{t('laundry')}</span>
        </button>

        <button
          id="nav-calendar"
          className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => handleTabChange('calendar')}
        >
          <span className="nav-btn__icon">📅</span>
          <span className="nav-btn__label">{t('calendar')}</span>
        </button>

        <button
          id="nav-insights"
          className={`nav-btn ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => handleTabChange('insights')}
        >
          <span className="nav-btn__icon">📊</span>
          <span className="nav-btn__label">{t('stats')}</span>
        </button>
      </nav>
    </div>
  );
}
