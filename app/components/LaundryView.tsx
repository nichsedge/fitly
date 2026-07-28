'use client';

import React, { useState } from 'react';
import { useLaundry } from '../contexts/LaundryContext';
import { useSettings } from '../contexts/SettingsContext';
import { CATEGORIES, Category, ClothingItem } from '../lib/types';
import Toast from './Toast';
import { triggerHaptic } from '../lib/haptics';
import { CategoryIcon, WashingMachine, Settings, Sparkles, CheckCircle2, Trash2, Calendar, History } from './AppIcon';

export default function LaundryView() {
  const { laundryCategories, setLaundryCategories, getWornItems, getWashHistory, markWashed, markAllWashed, deleteWashSession } = useLaundry();
  const { t } = useSettings();
  const [toast, setToast] = useState('');
  const [showAllItems, setShowAllItems] = useState(false);
  const [showCategorySettings, setShowCategorySettings] = useState(false);

  const toggleLaundryCategory = (cat: Category) => {
    const next = laundryCategories.includes(cat)
      ? laundryCategories.filter(c => c !== cat)
      : [...laundryCategories, cat];
    
    if (next.length === 0) {
      setToast('Select at least one category for laundry basket');
      return;
    }

    setLaundryCategories(next);
  };

  const washHistory = getWashHistory();
  const wornItems = getWornItems(showAllItems);

  const handleWashSingleItem = async (item: ClothingItem) => {
    triggerHaptic(12);
    await markWashed(item);
    setToast(`✓ ${item.name} marked washed & clean`);
  };

  const handleWashAll = async () => {
    triggerHaptic(15);
    const itemsToWash = wornItems.map(e => e.item);
    await markAllWashed(itemsToWash);
    setToast(`✓ All ${itemsToWash.length} item(s) marked washed & clean!`);
  };

  const handleDeleteWashSession = async (dayKey: string, washedItems: ClothingItem[]) => {
    triggerHaptic(10);
    await deleteWashSession(dayKey, washedItems);
    setToast('✓ Wash log entry deleted');
  };

  return (
    <div className="page-content" style={{ paddingBottom: 'calc(var(--space-12) + 20px)' }}>
      {/* Section Header */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WashingMachine size={22} color="var(--accent)" />
            <span>{t('laundry')}</span>
          </h2>
          <span className="section-count">{wornItems.length}</span>
        </div>

        <button
          className="btn btn-ghost"
          style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setShowCategorySettings(!showCategorySettings)}
          aria-expanded={showCategorySettings}
          aria-label="Laundry threshold settings"
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
      </div>

      {/* Category Settings Panel */}
      {showCategorySettings && (
        <div className="animate-in" style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-4)'
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            Track in Laundry Basket:
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Items in selected categories will automatically enter the laundry basket after wearing.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map(cat => {
              const isTracked = laundryCategories.includes(cat.value);
              return (
                <button
                  key={cat.value}
                  onClick={() => toggleLaundryCategory(cat.value)}
                  aria-pressed={isTracked}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isTracked ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: isTracked ? 'var(--accent-subtle)' : 'var(--bg-3)',
                    color: isTracked ? 'var(--accent)' : 'var(--text-secondary)'
                  }}
                >
                  <CategoryIcon category={cat.value} size={14} />
                  <span>{cat.label}</span>
                  <span>{isTracked ? '✓' : '+'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${!showAllItems ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => setShowAllItems(false)}
            aria-pressed={!showAllItems}
          >
            Tracked Basket ({getWornItems(false).length})
          </button>
          <button
            className={`btn ${showAllItems ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => setShowAllItems(true)}
            aria-pressed={showAllItems}
          >
            All Worn Items ({getWornItems(true).length})
          </button>
        </div>

        {wornItems.length > 0 && (
          <button
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: 12, background: 'var(--accent)', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleWashAll}
          >
            <WashingMachine size={16} />
            <span>Wash All ({wornItems.length})</span>
          </button>
        )}
      </div>

      {/* Worn Items List */}
      {wornItems.length === 0 ? (
        <div className="empty-state animate-in" style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
          <div className="empty-state__emoji" style={{ fontSize: 40, marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <Sparkles size={40} color="var(--accent)" />
          </div>
          <div className="empty-state__title" style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
            {showAllItems ? 'No worn items found' : 'Laundry basket is clean!'}
          </div>
          <p className="empty-state__desc" style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto' }}>
            {showAllItems ? 'No clothing items have unwashed wears recorded.' : 'All tracked wardrobe items are clean and ready to wear.'}
          </p>
        </div>
      ) : (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 'var(--space-6)' }}>
          {wornItems.map(({ item, wearsSinceWash }) => {
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '10px 14px'
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  background: 'var(--bg-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0
                }}>
                  {item.images && item.images.length > 0 ? (
                    <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <CategoryIcon category={item.category} size={22} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ textTransform: 'capitalize' }}>{item.category}</span>
                    <span>•</span>
                    <span style={{
                      color: wearsSinceWash >= 3 ? '#ef4444' : wearsSinceWash >= 2 ? '#eab308' : 'var(--accent)',
                      fontWeight: 700
                    }}>
                      Worn {wearsSinceWash}x since wash
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-ghost"
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#22c55e',
                    border: 'none',
                    borderRadius: 'var(--radius-pill)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onClick={() => handleWashSingleItem(item)}
                  aria-label={`Mark ${item.name} as clean`}
                >
                  <CheckCircle2 size={14} />
                  <span>Wash</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Wash History Section */}
      {washHistory.length > 0 && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} />
            <span>Wash History Log ({washHistory.length} sessions)</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {washHistory.map(({ key, date, items: washedItems }) => (
              <div
                key={key}
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} />
                    <span>{date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteWashSession(key, washedItems)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                    aria-label={`Delete wash history session for ${key}`}
                  >
                    <Trash2 size={14} />
                    <span>Delete Log</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {washedItems.map(item => (
                    <span
                      key={item.id}
                      style={{
                        fontSize: 11,
                        background: 'var(--bg-3)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
