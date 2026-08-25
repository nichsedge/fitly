'use client';

import { useState, useMemo, useEffect } from 'react';
import { ClothingItem, Category, SparkJoyStatus, RetirementReason } from '../lib/types';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useSettings } from '../contexts/SettingsContext';
import { konMariService } from '../services/KonMariService';
import { triggerHaptic } from '../lib/haptics';
import Toast from './Toast';
import OverviewTab from './minimalism/OverviewTab';
import AuditTab from './minimalism/AuditTab';
import ReleaseTab from './minimalism/ReleaseTab';
import CapsuleTab from './minimalism/CapsuleTab';
import { Sparkles, X } from './AppIcon';

interface Props {
  onClose: () => void;
}

type TabMode = 'overview' | 'audit' | 'release' | 'capsule';

export default function MinimalismAnalyzerModal({ onClose }: Props) {
  const { items, updateItem } = useWardrobe();
  const { t } = useSettings();

  const [activeTab, setActiveTab] = useState<TabMode>('overview');
  const [auditCategory, setAuditCategory] = useState<Category | 'all'>('all');
  const [currentAuditIndex, setCurrentAuditIndex] = useState(0);
  const [toast, setToast] = useState('');
  const [gratitudeNotes, setGratitudeNotes] = useState<Record<string, string>>({});
  const [retiringItemId, setRetiringItemId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Derived KonMari data
  const stats = useMemo(() => konMariService.calculateKonMariStats(items), [items]);
  const duplicateClusters = useMemo(() => konMariService.getDuplicateClusters(items), [items]);
  const auditQueue = useMemo(() => konMariService.getAuditQueue(items, auditCategory), [items, auditCategory]);
  const declutterCandidates = useMemo(() => konMariService.getDeclutterCandidates(items), [items]);

  // Ensure currentAuditIndex is in valid bounds
  const currentItem = auditQueue[currentAuditIndex] || null;

  /* ── Handlers ── */
  const handleAuditDecision = async (status: SparkJoyStatus) => {
    if (!currentItem) return;
    triggerHaptic(12);

    await updateItem({ ...currentItem, sparkJoy: status });

    if (status === 'joy') {
      setToast(`💖 "${currentItem.name}" sparks joy!`);
    } else if (status === 'essential') {
      setToast(`🧺 "${currentItem.name}" marked as Daily Essential`);
    } else {
      setToast(`🍂 "${currentItem.name}" queued to Thank & Release`);
    }

    if (currentAuditIndex < auditQueue.length - 1) {
      setCurrentAuditIndex(prev => prev + 1);
    }
  };

  const handleReleaseItem = async (item: ClothingItem, reason: RetirementReason) => {
    triggerHaptic(15);
    setRetiringItemId(item.id);

    const userNote = gratitudeNotes[item.id] || konMariService.getGratitudePrompt(item);

    const updated: ClothingItem = {
      ...item,
      retiredAt: Date.now(),
      retirementReason: reason,
      gratitudeNote: userNote,
      sparkJoy: 'no-joy',
    };

    await updateItem(updated);
    setRetiringItemId(null);
    setToast(`🌸 Thanked & released "${item.name}" (${reason})`);
  };

  const handleKeepItem = async (item: ClothingItem) => {
    triggerHaptic(10);
    await updateItem({
      ...item,
      sparkJoy: 'essential',
      retiredAt: undefined,
      retirementReason: undefined,
    });
    setToast(`✓ Kept "${item.name}" in wardrobe`);
  };

  const handleAuditCategoryChange = (cat: Category | 'all') => {
    triggerHaptic(8);
    setAuditCategory(cat);
    setCurrentAuditIndex(0);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 110 }}>
      <div
        className="modal-drawer minimalism-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}
      >
        <div className="modal-handle" />

        {/* Header */}
        <div className="minimalism-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)',
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {t('minimalismAnalyzer')}
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', fontWeight: 700 }}>
                    KonMari
                  </span>
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('minimalismDesc')}</p>
              </div>
            </div>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          {/* Sub-Tabs */}
          <div
            className="minimalism-tabs"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 6,
              marginTop: 14,
              background: 'var(--bg-3)',
              padding: 4,
              borderRadius: 'var(--radius-pill)',
            }}
          >
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
              📊 Overview
            </TabButton>
            <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')}>
              ✨ Tokimeki ({stats.unratedCount > 0 ? stats.unratedCount : '✓'})
            </TabButton>
            <TabButton active={activeTab === 'release'} onClick={() => setActiveTab('release')}>
              🌸 Release ({declutterCandidates.length})
            </TabButton>
            <TabButton active={activeTab === 'capsule'} onClick={() => setActiveTab('capsule')}>
              📋 Capsule
            </TabButton>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {activeTab === 'overview' && (
            <OverviewTab
              stats={stats}
              duplicateClusters={duplicateClusters}
              t={t as unknown as (key: string) => string}
              onGoAudit={() => { triggerHaptic(10); setActiveTab('audit'); }}
            />
          )}

          {activeTab === 'audit' && (
            <AuditTab
              items={items}
              auditCategory={auditCategory}
              auditQueue={auditQueue}
              currentAuditIndex={currentAuditIndex}
              currentItem={currentItem}
              onCategoryChange={handleAuditCategoryChange}
              onDecision={handleAuditDecision}
              onIndexChange={(next) => { triggerHaptic(8); setCurrentAuditIndex(next); }}
              onGoOverview={() => { triggerHaptic(8); setActiveTab('overview'); }}
            />
          )}

          {activeTab === 'release' && (
            <ReleaseTab
              declutterCandidates={declutterCandidates}
              gratitudeNotes={gratitudeNotes}
              onGratitudeNoteChange={(itemId, note) =>
                setGratitudeNotes(prev => ({ ...prev, [itemId]: note }))
              }
              retiringItemId={retiringItemId}
              onReleaseItem={handleReleaseItem}
              onKeepItem={handleKeepItem}
            />
          )}

          {activeTab === 'capsule' && <CapsuleTab />}

        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`minimalism-tab-btn ${active ? 'active' : ''}`}
      onClick={() => { triggerHaptic(8); onClick(); }}
    >
      {children}
    </button>
  );
}
