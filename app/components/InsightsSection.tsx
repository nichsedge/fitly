import { useWardrobe } from '../contexts/WardrobeContext';
import { useOutfits } from '../contexts/OutfitContext';
import { useSettings } from '../contexts/SettingsContext';
import { CATEGORIES, getColorLabel } from '../lib/types';
import { useMemo } from 'react';

export default function InsightsSection() {
  const { items } = useWardrobe();
  const { outfits } = useOutfits();
  const { formatPrice } = useSettings();

  const stats = useMemo(() => {
    if (items.length === 0) return null;

    // Most worn items
    const sortedByWear = [...items].sort((a, b) => (b.wearLogs?.length || 0) - (a.wearLogs?.length || 0));
    const topItems = sortedByWear.slice(0, 3).filter(i => (i.wearLogs?.length || 0) > 0);

    // Category distribution
    const catCounts = items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Total wears
    const totalWears = items.reduce((acc, item) => acc + (item.wearLogs?.length || 0), 0) +
                       outfits.reduce((acc, o) => acc + (o.wearLogs?.length || 0), 0);
    
    // Financials
    const totalValue = items.reduce((acc, item) => acc + (item.price || 0), 0);
    const pricedItems = items.filter(i => i.price && i.price > 0);
    const avgCPW = pricedItems.length > 0 
      ? pricedItems.reduce((acc, i) => acc + (i.price! / (Math.max(1, i.wearLogs?.length || 0))), 0) / pricedItems.length 
      : 0;
    
    const sortedByCPW = [...pricedItems].sort((a, b) => {
      const cpwa = a.price! / Math.max(1, a.wearLogs?.length || 0);
      const cpwb = b.price! / Math.max(1, b.wearLogs?.length || 0);
      return cpwa - cpwb;
    });

    const bestValue = sortedByCPW.slice(0, 3);
    const worstValue = [...sortedByCPW].reverse().slice(0, 3);

    // Color distribution
    const colorCounts = items.reduce((acc, item) => {
      acc[item.color] = (acc[item.color] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topColors = Object.entries(colorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Hibernating items (not worn in 6 months or 1 wear max if added > 6mo ago)
    // eslint-disable-next-line react-hooks/purity
    const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
    const hibernating = items.filter(item => {
      const lastWorn = item.wearLogs && item.wearLogs.length > 0 
        ? Math.max(...item.wearLogs)
        : (item.lastWornAt || 0);
      return item.createdAt < sixMonthsAgo && lastWorn < sixMonthsAgo;
    });

    return {
      topItems,
      catCounts,
      totalWears,
      itemCount: items.length,
      outfitCount: outfits.length,
      totalValue,
      avgCPW,
      bestValue,
      worstValue,
      topColors,
      hibernating
    };
  }, [items, outfits]);

  if (!stats) return null;

  return (
    <div className="insights-section animate-in">
      <div className="insights-grid">
        {/* Main Stats */}
        <div className="insight-card highlight">
          <div className="insight-card__title">Total Utility</div>
          <div className="insight-card__main-val">{stats.totalWears}</div>
          <div className="insight-card__sub-val">Times Worn</div>
          <div className="insight-card__progress-track">
            <div 
              className="insight-card__progress-bar" 
              style={{ width: `${Math.min(100, (stats.totalWears / (stats.itemCount * 5)) * 100)}%` }} 
            />
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-card__title">Financials</div>
          <div className="insight-card__main-val">{formatPrice(stats.totalValue)}</div>
          <div className="insight-card__sub-val">Wardrobe Value</div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
            AVG CPW: {formatPrice(stats.avgCPW)}
          </div>
        </div>
      </div>

      <div className="insights-grid" style={{ marginTop: 'var(--space-3)' }}>
        <div className="insight-card">
          <div className="insight-card__title">Diversity</div>
          <div className="insight-card__main-val">{stats.itemCount}</div>
          <div className="insight-card__sub-val">Unique Items</div>
          <div className="insight-card__mini-list">
            {CATEGORIES.slice(0, 4).map(cat => {
              const count = stats.catCounts[cat.value] || 0;
              const pct = Math.round((count / Math.max(1, stats.itemCount)) * 100);
              return (
                <div key={cat.value} className="mini-stat" style={{ gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }} title={cat.label}>{cat.emoji}</span>
                  <span className="mini-stat__label" style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', width: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {cat.label}
                  </span>
                  <span className="mini-stat__bar">
                    <div style={{ width: `${pct}%` }} />
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-primary)', minWidth: 16, textAlign: 'right', flexShrink: 0 }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="insight-card" style={{ marginTop: 'var(--space-3)' }}>
        <div className="insight-card__title">Color Palette</div>
        <div style={{ 
          display: 'flex', 
          height: 26, 
          borderRadius: 'var(--radius-pill)', 
          overflow: 'hidden', 
          marginTop: 12, 
          border: '1.5px solid var(--border)',
          background: 'var(--bg-3)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          {stats.topColors.map(([color, count], idx) => (
            <div 
              key={color} 
              style={{ 
                width: `${(count / stats.itemCount) * 100}%`, 
                backgroundColor: color,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2), inset 0 0 0 2px rgba(0,0,0,0.15)',
                borderRight: idx < stats.topColors.length - 1 ? '1.5px solid var(--bg-1)' : 'none',
                transition: 'width 0.3s ease'
              }} 
              title={`${getColorLabel(color)}: ${count} items`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          {stats.topColors.map(([color, count]) => {
            const colorLabel = getColorLabel(color);
            const pct = Math.round((count / stats.itemCount) * 100);
            return (
              <div key={color} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                <div style={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  backgroundColor: color, 
                  border: '1.5px solid rgba(255,255,255,0.4)',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                  flexShrink: 0 
                }} />
                <span>{colorLabel} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{pct}%</span></span>
              </div>
            );
          })}
        </div>
      </div>

      {stats.bestValue.length > 0 && (
        <div className="top-worn-section">
          <h3 className="insight-subtitle">Best Value (Lowest CPW)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-2)' }}>
            {stats.bestValue.map(item => {
              const cpw = item.price! / Math.max(1, item.wearLogs?.length || 0);
              const cat = CATEGORIES.find(c => c.value === item.category);
              return (
                <div 
                  key={item.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10, 
                    padding: '8px 10px', 
                    background: 'var(--bg-2)', 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius-md)' 
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 20 }}>
                    {item.images && item.images[0] ? (
                      <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      cat?.emoji
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)' }}>
                      {formatPrice(cpw)}<span style={{ fontSize: 9, fontWeight: 500, opacity: 0.8 }}> /wear</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.worstValue.length > 0 && (
        <div className="top-worn-section">
          <h3 className="insight-subtitle" style={{ color: '#ef4444' }}>Underutilized (Highest CPW)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-2)' }}>
            {stats.worstValue.map(item => {
              const cpw = item.price! / Math.max(1, item.wearLogs?.length || 0);
              const cat = CATEGORIES.find(c => c.value === item.category);
              return (
                <div 
                  key={item.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10, 
                    padding: '8px 10px', 
                    background: 'var(--bg-2)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                    borderRadius: 'var(--radius-md)' 
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 20 }}>
                    {item.images && item.images[0] ? (
                      <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      cat?.emoji
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#ef4444' }}>
                      {formatPrice(cpw)}<span style={{ fontSize: 9, fontWeight: 500, opacity: 0.8 }}> /wear</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.topItems.length > 0 && (
        <div className="top-worn-section">
          <h3 className="insight-subtitle">Your Favorites</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-2)' }}>
            {stats.topItems.map(item => {
              const wears = item.wearLogs?.length || 0;
              const cat = CATEGORIES.find(c => c.value === item.category);
              return (
                <div 
                  key={item.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10, 
                    padding: '8px 10px', 
                    background: 'var(--bg-2)', 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius-md)' 
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 20 }}>
                    {item.images && item.images[0] ? (
                      <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      cat?.emoji
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)' }}>
                      🔥 {wears} wears
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.hibernating.length > 0 && (
        <div className="top-worn-section">
          <h3 className="insight-subtitle" style={{ color: 'var(--text-muted)' }}>Hibernating (Declutter?)</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Items not worn in over 6 months.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 'var(--space-2)', opacity: 0.75 }}>
            {stats.hibernating.map(item => {
              const cat = CATEGORIES.find(c => c.value === item.category);
              return (
                <div 
                  key={item.id} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 10, 
                    padding: '8px 10px', 
                    background: 'var(--bg-2)', 
                    border: '1px solid var(--border)', 
                    borderRadius: 'var(--radius-md)' 
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--bg-3)', overflow: 'hidden', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 20 }}>
                    {item.images && item.images[0] ? (
                      <img src={item.images[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      cat?.emoji
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      Unworn &gt;6mo
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
