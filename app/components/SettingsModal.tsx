'use client';

import { useState, useRef, useEffect } from 'react';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useOutfits } from '../contexts/OutfitContext';
import { useTrips } from '../contexts/TripContext';
import { useSettings } from '../contexts/SettingsContext';
import { useRestoreBackup } from '../contexts/AppContextProvider';
import Toast from './Toast';
import TagsManagerModal from './TagsManagerModal';
import { Currency } from '../lib/i18n';
import { Category, ItemCondition, ClothingItem, Outfit, CustomTag, WardrobeLocation, Trip } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { exportWardrobeZip, importWardrobeZip, downloadZipBlob, restoreZipImages } from '../lib/zipBackup';
import { clearAllAppData } from '../lib/db';
import { LocationIcon, PRESET_LOCATION_ICONS, Trash2, Globe, Package, Download, Upload, Tag, AlertTriangle, Database, MapPin } from './AppIcon';

interface Props {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: Props) {
  const { items, tags, locations, addLocation, deleteLocation } = useWardrobe();
  const { outfits } = useOutfits();
  const { trips } = useTrips();
  const { isOffline, isInstallable, promptInstallApp, currency, setCurrency, language, setLanguage, t } = useSettings();
  const restoreBackup = useRestoreBackup();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  const [toast, setToast] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [showTagsManager, setShowTagsManager] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocIcon, setNewLocIcon] = useState('📍');
  const [isAddingLoc, setIsAddingLoc] = useState(false);
  const [storageStats, setStorageStats] = useState<{ usedMB: string; quotaMB: string; percent: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportingZip, setExportingZip] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          const usedMB = (estimate.usage / (1024 * 1024)).toFixed(1);
          const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(0);
          const percent = Math.min(100, Math.round((estimate.usage / estimate.quota) * 100));
          setStorageStats({ usedMB, quotaMB, percent });
        }
      }).catch(() => { });
    }
  }, []);

  const handleCreateLocation = async () => {
    if (!newLocName.trim()) return;
    await addLocation({
      id: uuidv4(),
      name: newLocName.trim(),
      icon: newLocIcon || 'map-pin'
    });
    setNewLocName('');
    setIsAddingLoc(false);
    setToast(`✓ Created location "${newLocName.trim()}"`);
  };



  const handleExportZip = async () => {
    try {
      setExportingZip(true);
      const zipBlob = await exportWardrobeZip(items, outfits, tags, locations, trips);
      downloadZipBlob(zipBlob);
      setToast('✓ Full ZIP Backup (with photos) downloaded!');
    } catch (err) {
      console.error('ZIP export failed:', err);
      setToast('❌ ZIP Backup failed');
    } finally {
      setExportingZip(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    try {
      const isZip = file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip');

      let items: ClothingItem[] = [];
      let outfits: Outfit[] = [];
      let tags: CustomTag[] = [];
      let locations: WardrobeLocation[] = [];
      let trips: Trip[] = [];
      let zipImages: Record<string, Blob> | undefined = undefined;

      if (isZip) {
        const result = await importWardrobeZip(file);
        if (!result.success || !result.data) {
          alert(`Restore failed: ${(result.errors || []).join(', ')}`);
          return;
        }
        items = result.data.items;
        outfits = result.data.outfits || [];
        tags = result.data.tags || [];
        locations = result.data.locations || [];
        trips = result.data.trips || [];
        zipImages = result.images;
      } else {
        const content = await file.text();
        const backup = JSON.parse(content);

        items = backup.items || backup.wardrobe || (Array.isArray(backup) ? backup : undefined);
        if (!items || !Array.isArray(items)) {
          alert('Restore failed: Invalid backup file format (missing items array)');
          return;
        }
        outfits = backup.outfits || [];
        tags = backup.tags || backup.categories || [];
        locations = backup.locations || [];
        trips = backup.trips || [];
      }

      const confirmRestore = window.confirm(
        `Warning: This will overwrite ALL current wardrobe data with the backup (${items.length} items). Continue?`
      );

      if (confirmRestore) {
        if (isZip && zipImages) {
          await restoreZipImages(zipImages);
        }
        await restoreBackup(items, outfits, tags, locations, trips);
        setToast('✓ Restore complete!');
        setTimeout(onClose, 1000);
      }
    } catch (err) {
      console.error('Restore failed:', err);
      alert('Restore failed: Invalid or corrupt backup file');
    } finally {
      setRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearAllData = async () => {
    const confirm1 = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL clothing items, photos, outfits, calendar plans, trips, and custom settings stored on this device.\n\nAre you sure you want to reset Fitly?'
    );
    if (!confirm1) return;

    const confirm2 = window.confirm(
      '🔴 FINAL CONFIRMATION: This action CANNOT be undone unless you have a backup file.\n\nClick OK to wipe all app data and restart.'
    );
    if (!confirm2) return;

    try {
      await clearAllAppData();
      setToast('✓ App data cleared. Reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Clear data failed:', err);
      alert('Failed to clear app data. Please try again.');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['id', 'name', 'category', 'brand', 'price', 'color', 'tags', 'status', 'condition', 'material', 'careInstructions', 'locationId', 'createdAt', 'wearCount'];
      const rows = items.map(item => {
        return [
          item.id,
          `"${(item.name || '').replace(/"/g, '""')}"`,
          item.category,
          `"${(item.brand || '').replace(/"/g, '""')}"`,
          item.price || '',
          item.color,
          `"${(item.tags || []).join(';')}"`,
          item.status,
          item.condition || 'good',
          `"${(item.material || '').replace(/"/g, '""')}"`,
          `"${(item.careInstructions || '').replace(/"/g, '""')}"`,
          item.locationId || 'loc-home',
          item.createdAt,
          item.wearLogs ? item.wearLogs.length : 0
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const filename = `fitly-wardrobe-${new Date().toISOString().split('T')[0]}.csv`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 10000);

      setToast('✓ CSV Spreadsheet exported!');
    } catch (err) {
      console.error('CSV export failed:', err);
      setToast('❌ CSV Export failed');
    }
  };

  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length <= 1) {
          alert('CSV file is empty or missing headers');
          return;
        }

        const { addItem } = await import('../lib/db');
        let count = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const parts = line.split(',');
          if (parts.length < 2) continue;

          const clean = (val: string) => (val || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim();
          const name = clean(parts[1] || parts[0]);
          if (!name || name.toLowerCase() === 'name') continue;

          const newItem = {
            id: uuidv4(),
            name,
            category: (clean(parts[2]) as Category) || 'top',
            brand: clean(parts[3]),
            price: parts[4] ? parseFloat(clean(parts[4])) || undefined : undefined,
            color: clean(parts[5]) || '#1a1a1a',
            tags: clean(parts[6]) ? clean(parts[6]).split(';').map(t => t.trim()) : [],
            status: 'ready' as const,
            condition: (clean(parts[8]) as ItemCondition) || 'good',
            material: clean(parts[9]),
            careInstructions: clean(parts[10]),
            locationId: clean(parts[11]) || 'loc-home',
            createdAt: Date.now(),
            images: [],
            wearLogs: []
          };

          await addItem(newItem);
          count++;
        }

        setToast(`✓ Imported ${count} item(s) from CSV!`);
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        console.error('CSV import failed:', err);
        alert('Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
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
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe size={16} />
                <span>Preferences</span>
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
                    English
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
                    Indonesia
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

            {/* Wardrobe Locations Management */}
            <div style={{
              background: 'var(--bg-3)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-4)',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={16} />
                  <span>Wardrobe Locations</span>
                </span>
                <button
                  className="btn btn-ghost"
                  style={{ padding: '2px 8px', fontSize: 11, height: 'auto' }}
                  onClick={() => setIsAddingLoc(!isAddingLoc)}
                >
                  {isAddingLoc ? 'Cancel' : '＋ Add Location'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {locations.map(loc => {
                  const itemCount = items.filter(i => (i.locationId || 'loc-home') === loc.id).length;
                  return (
                    <div key={loc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-2)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LocationIcon icon={loc.icon} size={16} /> {loc.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{itemCount} items</span>
                        {!loc.isDefault && (
                          <button
                            onClick={() => deleteLocation(loc.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
                            title="Delete Location"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isAddingLoc && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                      {PRESET_LOCATION_ICONS.map(preset => {
                        const IconComponent = preset.icon;
                        const isSelected = newLocIcon === preset.value;
                        return (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setNewLocIcon(preset.value)}
                            title={preset.label}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                              background: isSelected ? 'var(--accent-subtle)' : 'var(--bg-2)',
                              color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12
                            }}
                          >
                            <IconComponent size={14} />
                            <span>{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 1, height: 32, fontSize: 13, padding: '0 8px' }}
                        placeholder="Location name (e.g. Rent Room)..."
                        value={newLocName}
                        onChange={e => setNewLocName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateLocation()}
                        autoFocus
                      />
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0 12px', fontSize: 12, height: 32 }}
                        onClick={handleCreateLocation}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
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

            <div className="section-header" style={{ marginTop: 0, marginBottom: 12 }}>
              <span className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Database size={16} />
                <span>{t('dataManagement')}</span>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

              {/* Card 1: EXPORT & BACKUP */}
              <div style={{
                background: 'var(--bg-3)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Package size={16} />
                  <span>Backup Data</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                  Save a complete backup file containing all your clothes, outfits, tags, locations, and photos.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    id="btn-export-zip"
                    className="btn btn-ghost"
                    onClick={handleExportZip}
                    disabled={exportingZip}
                    style={{
                      justifyContent: 'flex-start',
                      width: '100%',
                      background: 'var(--bg-2)',
                      border: '1px solid var(--accent)',
                      color: 'var(--accent)',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Download size={14} />
                    <span>{exportingZip ? 'Creating Backup...' : 'Backup All'}</span>
                  </button>

                  <button
                    id="btn-export-csv"
                    className="btn btn-ghost"
                    onClick={handleExportCSV}
                    style={{
                      justifyContent: 'flex-start',
                      width: '100%',
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border)',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Download size={14} />
                    <span>Spreadsheet Export (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Card 2: IMPORT & RESTORE */}
              <div style={{
                background: 'var(--bg-3)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Upload size={16} />
                  <span>Import & Restore</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                  Restore a previously saved backup file or bulk import items from CSV.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    id="btn-restore-backup"
                    className="btn btn-ghost"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={restoring}
                    style={{
                      justifyContent: 'flex-start',
                      width: '100%',
                      background: 'var(--bg-2)',
                      border: '1px solid var(--accent)',
                      color: 'var(--accent)',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Upload size={14} />
                    <span>{restoring ? 'Restoring Backup...' : 'Restore Backup'}</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleRestore}
                    accept=".zip,.json,application/zip,application/json"
                    style={{ display: 'none' }}
                  />

                  <button
                    id="btn-import-csv"
                    className="btn btn-ghost"
                    onClick={() => csvFileInputRef.current?.click()}
                    style={{
                      justifyContent: 'flex-start',
                      width: '100%',
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border)',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Upload size={14} />
                    <span>Bulk Import CSV (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Card 3: STYLE TAGS */}
              <div style={{
                background: 'var(--bg-3)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag size={16} />
                    <span>Style Tags</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Manage custom tags for your clothes</div>
                </div>
                <button
                  id="btn-manage-tags"
                  className="btn btn-primary"
                  onClick={() => setShowTagsManager(true)}
                  style={{ fontSize: 12, padding: '6px 12px', height: 'auto', flexShrink: 0 }}
                >
                  Manage Tags
                </button>
              </div>

              {/* Card 4: DANGER ZONE - CLEAR ALL DATA */}
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                marginTop: 8
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={16} color="#ef4444" />
                  <span>Danger Zone</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 10px 0' }}>
                  Permanently delete all clothing items, photos, outfits, and settings stored on this device.
                </p>
                <button
                  id="btn-clear-all-data"
                  className="btn btn-ghost"
                  onClick={handleClearAllData}
                  style={{
                    justifyContent: 'center',
                    width: '100%',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Trash2 size={14} color="#ef4444" />
                  <span>Clear All App Data & Reset</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleRestore}
                style={{ display: 'none' }}
              />

              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                style={{ display: 'none' }}
              />
            </div>

            <div className="divider" />

            <div style={{ padding: 'var(--space-4)', background: 'var(--bg-3)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Fitly Storage Info</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                <span>{t('items')}: {items.length}</span>
                <span>{t('outfits')}: {outfits.length}</span>
                <span>Locations: {locations.length}</span>
              </div>
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-6)' }}>
              Fitly v1.1.0 • Local-First Android PWA
            </p>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      {showTagsManager && <TagsManagerModal onClose={() => setShowTagsManager(false)} />}
    </>
  );
}
