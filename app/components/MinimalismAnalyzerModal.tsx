'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ClothingItem, Category, SparkJoyStatus, RetirementReason } from '../lib/types';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useSettings } from '../contexts/SettingsContext';
import { konMariService, KONMARI_CATEGORY_ORDER, IDEAL_CAPSULE_BENCHMARKS } from '../services/KonMariService';
import { triggerHaptic } from '../lib/haptics';
import { ResolvedImage } from './ResolvedImage';
import Toast from './Toast';
import {
  Sparkles,
  CategoryIcon,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Tag,
  Shirt,
  Trash2,
  Award
} from './AppIcon';

interface Props {
  onClose: () => void;
}

type TabMode = 'overview' | 'audit' | 'release' | 'capsule';

export default function MinimalismAnalyzerModal({ onClose }: Props) {
  const { items, updateItem, deleteItem } = useWardrobe();
  const { formatPrice, t } = useSettings();

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

  // Compute live KonMari stats
  const stats = useMemo(() => {
    return konMariService.calculateKonMariStats(items);
  }, [items]);

  // Duplicate clusters
  const duplicateClusters = useMemo(() => {
    return konMariService.getDuplicateClusters(items);
  }, [items]);

  // Audit queue
  const auditQueue = useMemo(() => {
    return konMariService.getAuditQueue(items, auditCategory);
  }, [items, auditCategory]);

  // Declutter candidates
  const declutterCandidates = useMemo(() => {
    return konMariService.getDeclutterCandidates(items);
  }, [items]);

  // Ensure currentAuditIndex is in valid bounds
  const currentItem = auditQueue[currentAuditIndex] || null;

  const handleAuditDecision = async (status: SparkJoyStatus) => {
    if (!currentItem) return;
    triggerHaptic(12);

    const updated: ClothingItem = {
      ...currentItem,
      sparkJoy: status,
    };

    await updateItem(updated);

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
    const updated: ClothingItem = {
      ...item,
      sparkJoy: 'essential',
      retiredAt: undefined,
      retirementReason: undefined,
    };
    await updateItem(updated);
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
            <button
              className={`minimalism-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => { triggerHaptic(8); setActiveTab('overview'); }}
            >
              📊 Overview
            </button>
            <button
              className={`minimalism-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => { triggerHaptic(8); setActiveTab('audit'); }}
            >
              ✨ Tokimeki ({stats.unratedCount > 0 ? stats.unratedCount : '✓'})
            </button>
            <button
              className={`minimalism-tab-btn ${activeTab === 'release' ? 'active' : ''}`}
              onClick={() => { triggerHaptic(8); setActiveTab('release'); }}
            >
              🌸 Release ({declutterCandidates.length})
            </button>
            <button
              className={`minimalism-tab-btn ${activeTab === 'capsule' ? 'active' : ''}`}
              onClick={() => { triggerHaptic(8); setActiveTab('capsule'); }}
            >
              📋 Capsule
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ========================================================================= */}
          {/* 1. OVERVIEW & SCORECARD TAB */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Main Joy & Minimalism Score Hero */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(99, 102, 241, 0.12) 100%)',
                  border: '1px solid rgba(236, 72, 153, 0.25)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  alignItems: 'center',
                }}
              >
                {/* Left: Joy Index */}
                <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)', paddingRight: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#ec4899', letterSpacing: '0.05em' }}>
                    {t('joyScore')}
                  </div>
                  <div style={{ fontSize: 38, fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0' }}>
                    {stats.joyIndex}%
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {stats.joyCount} of {stats.totalItems - stats.unratedCount} rated spark joy
                  </div>
                </div>

                {/* Right: Wardrobe Health / Minimalism */}
                <div style={{ textAlign: 'center', paddingLeft: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em' }}>
                    {t('minimalismStage')}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
                    {stats.minimalismStage}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    Score: {stats.minimalismScore}/100
                  </div>
                </div>
              </div>

              {/* Audit Progress CTA Card */}
              <div
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {t('auditCompletion')}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: stats.auditCompletionRate === 100 ? 'var(--success)' : 'var(--accent)' }}>
                    {stats.auditCompletionRate}% ({stats.totalItems - stats.unratedCount}/{stats.totalItems})
                  </span>
                </div>

                <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 'var(--radius-pill)', overflow: 'hidden', marginBottom: 12 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${stats.auditCompletionRate}%`,
                      background: 'linear-gradient(90deg, #ec4899, #6366f1)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>

                <button
                  className="btn btn-primary btn-full"
                  onClick={() => { triggerHaptic(10); setActiveTab('audit'); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px' }}
                >
                  <Sparkles size={16} />
                  <span>{stats.auditCompletionRate < 100 ? t('startAudit') : 'Review Joy Ratings'}</span>
                </button>
              </div>

              {/* Tokimeki Breakdown Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '10px 8px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18 }}>💖</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#ec4899', marginTop: 2 }}>{stats.joyCount}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>Sparks Joy</div>
                </div>

                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '10px 8px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18 }}>🧺</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#3b82f6', marginTop: 2 }}>{stats.essentialCount}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>Essential</div>
                </div>

                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '10px 8px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18 }}>🍂</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>{stats.noJoyCount}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>Let Go</div>
                </div>

                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '10px 8px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 18 }}>❓</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-muted)', marginTop: 2 }}>{stats.unratedCount}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>Unrated</div>
                </div>
              </div>

              {/* Duplicate Alerts if any */}
              {duplicateClusters.length > 0 && (
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                    <AlertTriangle size={16} />
                    <span>{t('duplicateAlert')} ({duplicateClusters.length})</span>
                  </div>
                  {duplicateClusters.map(cluster => (
                    <p key={cluster.id} style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 4, lineHeight: 1.4 }}>
                      • {cluster.suggestion}
                    </p>
                  ))}
                </div>
              )}

              {/* Category Harmony Meters */}
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
                  {t('konmariCategoryOrder')}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stats.categories.map(cat => {
                    const pct = Math.min(100, Math.round((cat.count / Math.max(1, cat.targetMax)) * 100));
                    return (
                      <div key={cat.category} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--text-primary)' }}>
                            <CategoryIcon category={cat.category} size={14} />
                            {cat.label}
                          </span>
                          <span style={{ fontSize: 11, color: cat.isOverTarget ? '#f59e0b' : 'var(--text-muted)' }}>
                            {cat.count} items (Ideal: {cat.targetMin}–{cat.targetMax})
                          </span>
                        </div>
                        <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: cat.isOverTarget ? '#f59e0b' : 'var(--accent)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. TOKIMEKI AUDIT TAB */}
          {/* ========================================================================= */}
          {activeTab === 'audit' && (
            <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Category Filter Sequence */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                <button
                  className={`pill ${auditCategory === 'all' ? 'active' : ''}`}
                  onClick={() => handleAuditCategoryChange('all')}
                  style={{ fontSize: 11, padding: '4px 10px' }}
                >
                  All ({items.filter(i => !i.retiredAt).length})
                </button>
                {KONMARI_CATEGORY_ORDER.map(cat => {
                  const count = items.filter(i => !i.retiredAt && i.category === cat).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat}
                      className={`pill ${auditCategory === cat ? 'active' : ''}`}
                      onClick={() => handleAuditCategoryChange(cat)}
                      style={{ fontSize: 11, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <CategoryIcon category={cat} size={12} />
                      <span style={{ textTransform: 'capitalize' }}>{cat}</span> ({count})
                    </button>
                  );
                })}
              </div>

              {/* Current Audit Card */}
              {currentItem ? (
                <div
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  {/* Item Image */}
                  <div
                    style={{
                      width: 180,
                      height: 180,
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--bg-3)',
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'grid',
                      placeItems: 'center',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      marginBottom: 14,
                    }}
                  >
                    <ResolvedImage
                      src={currentItem.images && currentItem.images[0]}
                      alt={currentItem.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      fallback={<CategoryIcon category={currentItem.category} size={64} />}
                    />
                    {currentItem.sparkJoy && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'rgba(0,0,0,0.7)',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {currentItem.sparkJoy === 'joy' ? '💖 Sparks Joy' : currentItem.sparkJoy === 'essential' ? '🧺 Essential' : '🍂 Let Go'}
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 4 }}>
                    {currentItem.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    {currentItem.brand && <span>{currentItem.brand} •</span>}
                    <span style={{ textTransform: 'capitalize' }}>{currentItem.category}</span>
                    <span>• Worn {currentItem.wearLogs?.length || 0}x</span>
                    {currentItem.price && <span>• {formatPrice(currentItem.price)}</span>}
                  </div>

                  {/* Core Question Prompt */}
                  <div
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                      border: '1px solid rgba(236, 72, 153, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: 16,
                    }}
                  >
                    🌸 &ldquo;{t('sparkJoyPrompt')}&rdquo;
                  </div>

                  {/* Decision Actions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, width: '100%' }}>
                    <button
                      className="btn"
                      onClick={() => handleAuditDecision('joy')}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: '12px 8px',
                        borderRadius: 'var(--radius-md)',
                        background: currentItem.sparkJoy === 'joy' ? 'rgba(236, 72, 153, 0.3)' : 'var(--bg-3)',
                        border: '1px solid #ec4899',
                        color: '#ec4899',
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontSize: 22 }}>💖</span>
                      <span>Sparks Joy</span>
                    </button>

                    <button
                      className="btn"
                      onClick={() => handleAuditDecision('essential')}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: '12px 8px',
                        borderRadius: 'var(--radius-md)',
                        background: currentItem.sparkJoy === 'essential' ? 'rgba(59, 130, 246, 0.3)' : 'var(--bg-3)',
                        border: '1px solid #3b82f6',
                        color: '#3b82f6',
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontSize: 22 }}>🧺</span>
                      <span>Essential</span>
                    </button>

                    <button
                      className="btn"
                      onClick={() => handleAuditDecision('no-joy')}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: '12px 8px',
                        borderRadius: 'var(--radius-md)',
                        background: currentItem.sparkJoy === 'no-joy' ? 'rgba(245, 158, 11, 0.3)' : 'var(--bg-3)',
                        border: '1px solid #f59e0b',
                        color: '#f59e0b',
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontSize: 22 }}>🍂</span>
                      <span>Let Go</span>
                    </button>
                  </div>

                  {/* Navigation Stepper */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 14 }}>
                    <button
                      className="btn btn-ghost"
                      disabled={currentAuditIndex === 0}
                      onClick={() => { triggerHaptic(8); setCurrentAuditIndex(prev => Math.max(0, prev - 1)); }}
                      style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <ChevronLeft size={14} /> Back
                    </button>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {currentAuditIndex + 1} of {auditQueue.length}
                    </span>
                    <button
                      className="btn btn-ghost"
                      disabled={currentAuditIndex >= auditQueue.length - 1}
                      onClick={() => { triggerHaptic(8); setCurrentAuditIndex(prev => Math.min(auditQueue.length - 1, prev + 1)); }}
                      style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-2)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🌸</div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{t('auditCompleted')}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{t('auditCompletedDesc')}</p>
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 16 }}
                    onClick={() => { triggerHaptic(8); setActiveTab('overview'); }}
                  >
                    View Scorecard
                  </button>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. THANK & RELEASE DECLUTTER STUDIO TAB */}
          {/* ========================================================================= */}
          {activeTab === 'release' && (
            <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.25)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: '#ec4899', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🌸</span> {t('gratitudeRitual')}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                  In the KonMari method, we sincerely thank each piece for its service and lessons before parting ways.
                </p>
              </div>

              {declutterCandidates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--bg-2)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>✨</div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>No Items Queued for Release</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Your wardrobe is currently free of unwanted items. Perform a Tokimeki audit anytime!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {declutterCandidates.map(item => {
                    const defaultPrompt = konMariService.getGratitudePrompt(item);
                    const note = gratitudeNotes[item.id] ?? defaultPrompt;

                    return (
                      <div
                        key={item.id}
                        style={{
                          background: 'var(--bg-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', flexShrink: 0 }}>
                            <ResolvedImage
                              src={item.images && item.images[0]}
                              alt={item.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              fallback={<CategoryIcon category={item.category} size={24} />}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              Worn {item.wearLogs?.length || 0} times • {item.brand || item.category}
                            </div>
                          </div>
                        </div>

                        {/* Gratitude Reflection Note */}
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: '#ec4899', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                            <span>🌸</span> {t('gratitudeNote')}
                          </label>
                          <textarea
                            className="form-input"
                            rows={2}
                            value={note}
                            onChange={(e) => setGratitudeNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                            style={{ fontSize: 11, resize: 'vertical', minHeight: 46 }}
                          />
                        </div>

                        {/* Release Actions */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <button
                            className="btn btn-primary"
                            disabled={retiringItemId === item.id}
                            onClick={() => handleReleaseItem(item, 'donated')}
                            style={{ fontSize: 11, padding: '6px 10px', flex: 1 }}
                          >
                            🎁 {t('donate')}
                          </button>
                          <button
                            className="btn btn-ghost"
                            disabled={retiringItemId === item.id}
                            onClick={() => handleReleaseItem(item, 'sold')}
                            style={{ fontSize: 11, padding: '6px 10px', flex: 1 }}
                          >
                            🏷️ {t('sell')}
                          </button>
                          <button
                            className="btn btn-ghost"
                            disabled={retiringItemId === item.id}
                            onClick={() => handleReleaseItem(item, 'recycled')}
                            style={{ fontSize: 11, padding: '6px 10px', flex: 1 }}
                          >
                            ♻️ {t('recycle')}
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => handleKeepItem(item)}
                            style={{ fontSize: 11, padding: '6px 10px', color: 'var(--text-muted)' }}
                            title="Keep in closet"
                          >
                            ↩️ Keep
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. CAPSULE GUIDE TAB */}
          {/* ========================================================================= */}
          {activeTab === 'capsule' && (
            <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Award size={16} color="var(--accent)" />
                  The 6 KonMari Rules of Tidying
                </h3>
                <ol style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 18, lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li><strong>Commit yourself to tidying up:</strong> Set a clear intention for a peaceful wardrobe.</li>
                  <li><strong>Imagine your ideal lifestyle:</strong> Clarify the styles and looks that truly express who you are.</li>
                  <li><strong>Finish discarding first:</strong> Thank items for their lessons before parting.</li>
                  <li><strong>Tidy by category, not by location:</strong> Gather all tops, all bottoms, etc.</li>
                  <li><strong>Follow the right order:</strong> Tops → Bottoms → Outerwear → Shoes → Bags → Accessories → Underwear.</li>
                  <li><strong>Ask yourself if it sparks joy (Tokimeki):</strong> Keep only what elevates your spirit.</li>
                </ol>
              </div>

              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
                  Capsule Wardrobe Targets (30–50 Piece Lean Closet)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(IDEAL_CAPSULE_BENCHMARKS).map(([cat, bench]) => (
                    <div key={cat} style={{ background: 'var(--bg-3)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CategoryIcon category={cat as Category} size={14} />
                        {bench.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
                        Target: {bench.min}–{bench.max} pieces
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
