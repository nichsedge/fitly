'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from './AppProvider';
import Toast from './Toast';
import TagsManagerModal from './TagsManagerModal';
import { Currency, Language } from '../lib/i18n';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const { items, outfits, tags, restoreBackup, isOffline, isInstallable, promptInstallApp, currency, setCurrency, language, setLanguage, t } = useApp();
  const [toast, setToast] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [storageStats, setStorageStats] = useState<{ usedMB: string; quotaMB: string; percent: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          const usedMB = (estimate.usage / (1024 * 1024)).toFixed(1);
          const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(0);
          const percent = Math.min(100, Math.round((estimate.usage / estimate.quota) * 100));
          setStorageStats({ usedMB, quotaMB, percent });
        }
      }).catch(() => {});
    }
  }, []);

  const handleBackup = () => {
    try {
      const data = {
        version: 2,
        timestamp: Date.now(),
        items,
        outfits,
        tags,
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      
      link.href = url;
      link.download = `wardrobe-backup-${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setToast('✓ Backup downloaded!');
    } catch (err) {
      console.error('Backup failed:', err);
      setToast('❌ Backup failed');
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    const reader = new FileReader();

    reader.onload = async (ev) => {
      try {
        const content = ev.target?.result as string;
        const backup = JSON.parse(content);
        
        if (!backup.items || !Array.isArray(backup.items)) {
          throw new Error('Invalid backup format: missing items');
        }

        const confirmRestore = window.confirm(
          'Warning: This will overwrite ALL current wardrobe data with the backup. Continue?'
        );

        if (confirmRestore) {
          await restoreBackup(backup.items, backup.outfits || [], backup.tags);
          setToast('✓ Restore complete!');
          setTimeout(onClose, 1000);
        }
      } catch (err) {
        console.error('Restore failed:', err);
        alert('Restore failed: Invalid backup file');
      } finally {
        setRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet animate-scale" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <span className="modal-title">{t('settings')}</span>
            <button id="settings-close" className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">

            {/* Language & Currency Selection */}
            <div style={{
              background: 'var(--bg-3)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                🌐 Preferences
              </div>

              {/* Language Selector */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  {t('languageLabel')}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { setLanguage('en'); setToast('Language set to English'); }}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: 12,
                      fontWeight: 700,
                      border: language === 'en' ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: language === 'en' ? 'var(--accent-subtle)' : 'var(--bg-2)',
                      color: language === 'en' ? 'var(--accent)' : 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    🇬🇧 English
                  </button>
                  <button
                    onClick={() => { setLanguage('id'); setToast('Bahasa diubah ke Bahasa Indonesia'); }}
                    style={{
                      flex: 1,
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: 12,
                      fontWeight: 700,
                      border: language === 'id' ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: language === 'id' ? 'var(--accent-subtle)' : 'var(--bg-2)',
                      color: language === 'id' ? 'var(--accent)' : 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    🇮🇩 Indonesia
                  </button>
                </div>
              </div>

              {/* Currency Selector */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  {t('currencyLabel')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
                  {(['IDR', 'USD', 'EUR', 'GBP'] as Currency[]).map(curr => (
                    <button
                      key={curr}
                      onClick={() => { setCurrency(curr); setToast(`Currency set to ${curr}`); }}
                      style={{
                        padding: '6px 4px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: 'center',
                        border: currency === curr ? '2px solid var(--accent)' : '1px solid var(--border)',
                        background: currency === curr ? 'var(--accent-subtle)' : 'var(--bg-2)',
                        color: currency === curr ? 'var(--accent)' : 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      {curr === 'IDR' ? 'Rp (IDR)' : curr}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Offline & App Installation Status */}
            <div style={{
              background: 'var(--bg-3)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{t('localAppStatus')}</span>
                <span style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontWeight: 600,
                  background: isOffline ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                  color: isOffline ? '#eab308' : '#22c55e',
                  border: isOffline ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid rgba(34, 197, 94, 0.4)'
                }}>
                  {isOffline ? `⚡ ${t('offline')}` : '✓ Offline Ready'}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {t('localStatusDesc')}
              </p>

              {/* Storage Quota Meter */}
              {storageStats && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>{t('deviceStorageUsed')}</span>
                    <span>{storageStats.usedMB} MB / {storageStats.quotaMB} MB</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'var(--bg-4)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.max(2, storageStats.percent)}%`,
                      height: '100%',
                      background: storageStats.percent > 80 ? 'var(--danger)' : 'var(--accent)',
                      borderRadius: 3
                    }} />
                  </div>
                </div>
              )}

              {isInstallable && (
                <button
                  onClick={promptInstallApp}
                  style={{
                    marginTop: 12,
                    width: '100%',
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  {t('installAndroid')}
                </button>
              )}
            </div>

            <div className="section-header" style={{ marginTop: 0 }}>
              <span className="section-title">{t('dataManagement')}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <button 
                id="btn-backup-wardrobe"
                className="btn btn-ghost btn-full" 
                onClick={handleBackup}
                style={{ justifyContent: 'flex-start', paddingLeft: 'var(--space-4)' }}
              >
                {t('exportBackup')}
              </button>
              
              <button 
                id="btn-restore-wardrobe"
                className="btn btn-ghost btn-full" 
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring}
                style={{ justifyContent: 'flex-start', paddingLeft: 'var(--space-4)' }}
              >
                {restoring ? 'Restoring...' : t('restoreBackup')}
              </button>

              <button 
                id="btn-manage-tags"
                className="btn btn-ghost btn-full" 
                onClick={() => setShowTagsManager(true)}
                style={{ justifyContent: 'flex-start', paddingLeft: 'var(--space-4)' }}
              >
                {t('manageTags')}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestore}
                style={{ display: 'none' }}
              />
            </div>

            <div className="divider" />
            
            <div style={{ padding: 'var(--space-4)', background: 'var(--bg-3)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Fitly Storage Info</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                <span>{t('items')}: {items.length}</span>
                <span>{t('outfits')}: {outfits.length}</span>
                <span>{t('styles')}: {tags.length}</span>
              </div>
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-6)' }}>
              Fitly v1.0.0 • Local-First Android PWA
            </p>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      {showTagsManager && <TagsManagerModal onClose={() => setShowTagsManager(false)} />}
    </>
  );
}
