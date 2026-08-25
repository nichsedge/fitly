import { useState } from 'react';
import { ClothingItem, Category, CATEGORIES } from '../lib/types';
import { useWardrobe } from '../contexts/WardrobeContext';
import { useOutfits } from '../contexts/OutfitContext';
import { uuidv4 } from '../lib/id';
import Toast from './Toast';
import { CategoryIcon } from './AppIcon';
import { ResolvedImage } from './ResolvedImage';

interface Props {
  startingItem: ClothingItem;
  onClose: () => void;
}

export default function DailyOutfitBuilder({ startingItem, onClose }: Props) {
  const { items, activeLocationId, updateItem } = useWardrobe();
  const { addOutfit } = useOutfits();
  
  // Filter available items by active location if set
  const availableItems = items.filter(i => 
    activeLocationId === 'all' || (i.locationId || 'loc-home') === activeLocationId
  );

  // Track selected items by category. Initialize with the starting item.
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({
    [startingItem.category]: startingItem.id
  });
  const [toast, setToast] = useState('');

  // Get categories other than the starting one for suggestions
  const priorityCategories: Category[] = ['top', 'bottom', 'underwear', 'outerwear', 'shoes', 'accessory', 'bag'];
  const categoriesToShow = priorityCategories.filter(
    cat => cat !== startingItem.category && availableItems.filter(i => i.category === cat).length > 0
  );

  const handleSelect = (category: Category, id: string) => {
    setSelectedItems(prev => {
      if (prev[category] === id) {
        const next = { ...prev };
        delete next[category];
        return next;
      }
      return { ...prev, [category]: id };
    });
  };

  const handleSave = async () => {
    const selectedIds = Object.values(selectedItems);
    if (selectedIds.length === 0) return;

    const now = Date.now();
    
    // Update wear logs for all selected items
    const itemsToUpdate = items.filter(i => selectedIds.includes(i.id));
    for (const item of itemsToUpdate) {
      const wearLogs = item.wearLogs || [];
      if (!item.wearLogs && item.lastWornAt) {
        wearLogs.push(item.lastWornAt);
      }
      wearLogs.push(now);
      await updateItem({ ...item, wearLogs, lastWornAt: now });
    }

    // Create an outfit record
    const outfitName = `Look: ${new Date(now).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
    await addOutfit({
      id: uuidv4(),
      name: outfitName,
      note: 'Logged from Daily Outfit Builder',
      itemIds: selectedIds,
      createdAt: now,
      wearLogs: [now]
    });

    setToast('✓ Outfit logged!');
    setTimeout(onClose, 1200);
  };

  return (
    <>
      <div className="modal-overlay" style={{ zIndex: 110 }}>
        <div className="modal-sheet animate-scale" onClick={e => e.stopPropagation()} style={{ height: '90dvh', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-header">
            <div>
              <span className="modal-title">What else are you wearing?</span>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Building an outfit around {startingItem.name}
              </p>
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', paddingBottom: 'var(--space-12)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              
              {/* Starting Item Display */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', background: 'var(--bg-2)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', background: 'var(--bg-3)', overflow: 'hidden', flexShrink: 0 }}>
                  <ResolvedImage
                    src={startingItem.images && startingItem.images[0]}
                    alt={startingItem.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    fallback={
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CategoryIcon category={startingItem.category} size={24} />
                      </div>
                    }
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{startingItem.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>Starting item</div>
                </div>
              </div>

              {/* Suggestions row by row */}
              {categoriesToShow.map(cat => {
                const catItems = availableItems.filter(i => i.category === cat);
                if (catItems.length === 0) return null;
                const catInfo = CATEGORIES.find(c => c.value === cat);

                return (
                  <div key={cat}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CategoryIcon category={cat} size={16} />
                        <span>Pick a {catInfo?.label}</span>
                      </span>
                      {selectedItems[cat] && <span style={{ color: 'var(--accent)', fontSize: 12 }}>✓ Selected</span>}
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: 'var(--space-3)', 
                      overflowX: 'auto', 
                      paddingBottom: 'var(--space-2)',
                      scrollSnapType: 'x mandatory',
                      scrollbarWidth: 'thin'
                    }}>
                      {catItems.map(item => {
                        const isSelected = selectedItems[cat] === item.id;
                        return (
                          <div 
                            key={item.id}
                            onClick={() => handleSelect(cat, item.id)}
                            style={{ 
                              width: 104, 
                              flexShrink: 0, 
                              scrollSnapAlign: 'start',
                              cursor: 'pointer',
                              background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface)',
                              border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                              borderRadius: 'var(--radius-lg)',
                              padding: 6,
                              boxSizing: 'border-box',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 6,
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ 
                              width: '100%', 
                              aspectRatio: '1', 
                              borderRadius: 'calc(var(--radius-lg) - 4px)', 
                              background: 'var(--bg-3)',
                              overflow: 'hidden',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <ResolvedImage
                                src={item.images && item.images[0]}
                                alt={item.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                fallback={
                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CategoryIcon category={item.category} size={28} />
                                  </div>
                                }
                              />
                              
                              {isSelected && (
                                <div style={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  background: 'var(--accent)',
                                  color: '#fff',
                                  borderRadius: '50%',
                                  width: 22,
                                  height: 22,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 12,
                                  fontWeight: 'bold',
                                  zIndex: 3,
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                }}>
                                  ✓
                                </div>
                              )}
                            </div>
                            <div style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              width: '100%'
                            }}>
                              {item.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
          
          <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--border)', background: 'var(--modal-bg)', position: 'sticky', bottom: 0 }}>
            <button className="btn btn-primary btn-full" onClick={handleSave}>
              Save Today&apos;s Look ({Object.keys(selectedItems).length} items)
            </button>
            <p style={{ textAlign: 'center', marginTop: 'var(--space-2)', fontSize: 12 }}>
              <button 
                onClick={() => {
                  // just log the single item and close
                  const now = Date.now();
                  const wearLogs = startingItem.wearLogs || [];
                  if (!startingItem.wearLogs && startingItem.lastWornAt) { wearLogs.push(startingItem.lastWornAt); }
                  wearLogs.push(now);
                  updateItem({ ...startingItem, wearLogs, lastWornAt: now }).then(() => {
                    setToast('✓ Marked single item worn!');
                    setTimeout(onClose, 1200);
                  });
                }} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline' }}
              >
                Skip, just wearing this one piece
              </button>
            </p>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  );
}
