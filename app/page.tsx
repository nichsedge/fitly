'use client';

import { useState } from 'react';
import { useWardrobe } from './contexts/WardrobeContext';
import { useSettings } from './contexts/SettingsContext';
import { useAppLoading } from './contexts/AppContextProvider';
import WardrobeView from './components/WardrobeView';
import OutfitsView from './components/OutfitsView';
import LaundryView from './components/LaundryView';
import AddItemView from './components/AddItemView';
import CalendarTab from './components/CalendarTab';
import InsightsSection from './components/InsightsSection';
import SettingsModal from './components/SettingsModal';
import TripsView from './components/TripsView';
import QuickAddModal from './components/QuickAddModal';
import MoreMenuModal from './components/MoreMenuModal';
import ErrorBoundary from './components/ErrorBoundary';
import { ActiveTab } from './lib/types';
import { triggerHaptic } from './lib/haptics';
import { laundryService } from './services/LaundryService';
import { Shirt, Sparkles, Plus, WashingMachine, MoreHorizontal, Sun, Moon, Settings, Zap } from './components/AppIcon';

export default function Home() {
  const loading = useAppLoading();
  const { items, locations, activeLocationId, setActiveLocationId } = useWardrobe();
  const { theme, toggleTheme, isOffline, t, language, setLanguage } = useSettings();

  const [activeTab, setActiveTab] = useState<ActiveTab>('wardrobe');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleTabChange = (tab: ActiveTab) => {
    triggerHaptic(8);
    setActiveTab(tab);
  };

  const dirtyCount = laundryService.getWornItems(items, undefined, true).length;
  const isMoreActive = ['calendar', 'trips', 'insights'].includes(activeTab);

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
          <div className="app-header__logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shirt size={22} color="var(--accent)" />
          </div>
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
              marginLeft: 6,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <Zap size={10} />
              <span>{t('offline')}</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Location Selector Bar */}
          <select
            id="header-location-select"
            value={activeLocationId}
            onChange={(e) => {
              setActiveLocationId(e.target.value);
              triggerHaptic(8);
            }}
            style={{
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
              maxWidth: 130
            }}
            title="Filter by Location (Home, Rent Room, etc.)"
          >
            <option value="all">All Locations</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>

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
              padding: '3px 8px',
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
            {language === 'en' ? 'ID' : 'EN'}
          </button>

          <button 
            className="btn-circle" 
            onClick={() => { toggleTheme(); triggerHaptic(10); }}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button 
            id="btn-settings"
            className="btn-circle" 
            onClick={() => { setIsSettingsOpen(true); triggerHaptic(10); }}
            aria-label="Settings"
            title="Settings & Storage"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'wardrobe' && (
          <ErrorBoundary>
            <WardrobeView onNavigateToAdd={() => handleTabChange('add')} />
          </ErrorBoundary>
        )}
        {activeTab === 'outfits' && (
          <ErrorBoundary>
            <OutfitsView />
          </ErrorBoundary>
        )}
        {activeTab === 'laundry' && (
          <ErrorBoundary>
            <LaundryView />
          </ErrorBoundary>
        )}
        {activeTab === 'calendar' && (
          <ErrorBoundary>
            <CalendarTab />
          </ErrorBoundary>
        )}
        {activeTab === 'trips' && (
          <ErrorBoundary>
            <TripsView />
          </ErrorBoundary>
        )}
        {activeTab === 'insights' && (
          <ErrorBoundary>
            <div className="page-content">
              <div className="section-header">
                <h2 className="section-title">{t('stats')}</h2>
              </div>
              <InsightsSection />
            </div>
          </ErrorBoundary>
        )}
        {activeTab === 'add' && (
          <ErrorBoundary>
            <AddItemView onDone={() => handleTabChange('wardrobe')} />
          </ErrorBoundary>
        )}
      </main>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {isQuickAddOpen && (
        <QuickAddModal 
          onClose={() => setIsQuickAddOpen(false)} 
          onSelectAction={(tab) => handleTabChange(tab)}
        />
      )}

      {isMoreOpen && (
        <MoreMenuModal 
          activeTab={activeTab}
          onClose={() => setIsMoreOpen(false)}
          onSelectTab={(tab) => handleTabChange(tab)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Modern 5-Slot Bottom Nav */}
      <nav className="bottom-nav">
        <button
          id="nav-wardrobe"
          className={`nav-btn ${activeTab === 'wardrobe' ? 'active' : ''}`}
          onClick={() => handleTabChange('wardrobe')}
        >
          <span className="nav-btn__icon"><Shirt size={20} /></span>
          <span className="nav-btn__label">{t('wardrobe')}</span>
        </button>

        <button
          id="nav-outfits"
          className={`nav-btn ${activeTab === 'outfits' ? 'active' : ''}`}
          onClick={() => handleTabChange('outfits')}
        >
          <span className="nav-btn__icon"><Sparkles size={20} /></span>
          <span className="nav-btn__label">{t('outfits')}</span>
        </button>

        {/* Center Quick Action FAB */}
        <div className="nav-center-slot">
          <button
            id="nav-quick-add"
            className="nav-btn nav-btn--add"
            onClick={() => {
              triggerHaptic(12);
              setIsQuickAddOpen(true);
            }}
            aria-label="Quick Add"
            title="Quick Add Item, Outfit, or Trip"
          >
            <span className="nav-btn__icon"><Plus size={22} /></span>
          </button>
        </div>

        <button
          id="nav-laundry"
          className={`nav-btn ${activeTab === 'laundry' ? 'active' : ''}`}
          onClick={() => handleTabChange('laundry')}
        >
          <span className="nav-btn__icon" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <WashingMachine size={20} />
            {dirtyCount > 0 && (
              <span className="nav-btn__badge">{dirtyCount > 9 ? '9+' : dirtyCount}</span>
            )}
          </span>
          <span className="nav-btn__label">{t('laundry')}</span>
        </button>

        <button
          id="nav-more"
          className={`nav-btn ${isMoreActive || isMoreOpen ? 'active' : ''}`}
          onClick={() => {
            triggerHaptic(10);
            setIsMoreOpen(true);
          }}
        >
          <span className="nav-btn__icon"><MoreHorizontal size={20} /></span>
          <span className="nav-btn__label">More</span>
        </button>
      </nav>
    </div>
  );
}

