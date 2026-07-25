'use client';

import { useApp } from './AppProvider';
import { CATEGORIES, COLORS, ClothingItem } from '../lib/types';
import { useMemo } from 'react';

export default function InsightsSection() {
  const { items, outfits, formatPrice, currency } = useApp();

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
  }, [items, outfits, currency]);

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
            {CATEGORIES.slice(0, 4).map(cat => (
              <div key={cat.value} className="mini-stat">
                <span title={cat.label}>{cat.emoji}</span>
                <span className="mini-stat__bar">
                  <div style={{ width: `${(stats.catCounts[cat.value] || 0) / Math.max(1, stats.itemCount) * 100}%` }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="insight-card" style={{ marginTop: 'var(--space-3)' }}>
        <div className="insight-card__title">Color Palette</div>
        <div style={{ display: 'flex', height: 24, borderRadius: 'var(--radius-pill)', overflow: 'hidden', marginTop: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
          {stats.topColors.map(([color, count]) => (
            <div 
              key={color} 
              style={{ 
                width: `${(count / stats.itemCount) * 100}%`, 
                backgroundColor: color,
                transition: 'width 0.3s ease'
              }} 
              title={`${count} items`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          {stats.topColors.map(([color, count]) => (
            <div key={color} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
              {Math.round((count / stats.itemCount) * 100)}%
            </div>
          ))}
        </div>
      </div>

      {stats.bestValue.length > 0 && (
        <div className="top-worn-section">
          <h3 className="insight-subtitle">Best Value (Lowest CPW)</h3>
          <div className="fav-items-row">
            {stats.bestValue.map(item => (
              <div key={item.id} className="fav-item-bubble" style={{ border: '2px solid var(--success)' }}>
                {item.images[0] ? (
                  <img src={item.images[0]} alt={item.name} />
                ) : (
                  <div className="fav-item-placeholder">{CATEGORIES.find(c => c.value === item.category)?.emoji}</div>
                )}
                <div className="fav-item-badge" style={{ background: 'var(--success)' }}>
                  {formatPrice(item.price! / Math.max(1, item.wearLogs?.length || 0))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.topItems.length > 0 && (
        <div className="top-worn-section">
          <h3 className="insight-subtitle">Your Favorites</h3>
          <div className="fav-items-row">
            {stats.topItems.map(item => (
              <div key={item.id} className="fav-item-bubble">
                {item.images && item.images[0] ? (
                  <img src={item.images[0]} alt={item.name} />
                ) : (
                  <div className="fav-item-placeholder">{CATEGORIES.find(c => c.value === item.category)?.emoji}</div>
                )}
                <div className="fav-item-badge">{item.wearLogs?.length || 0}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.hibernating.length > 0 && (
        <div className="top-worn-section">
          <h3 className="insight-subtitle" style={{ color: 'var(--text-muted)' }}>Hibernating (Declutter?)</h3>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Items not worn in over 6 months.</p>
          <div className="fav-items-row" style={{ opacity: 0.6 }}>
            {stats.hibernating.map(item => (
              <div key={item.id} className="fav-item-bubble">
                {item.images && item.images[0] ? (
                  <img src={item.images[0]} alt={item.name} />
                ) : (
                  <div className="fav-item-placeholder">{CATEGORIES.find(c => c.value === item.category)?.emoji}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
