'use client';

import { Category } from '../../lib/types';
import { IDEAL_CAPSULE_BENCHMARKS } from '../../services/KonMariService';
import { CategoryIcon, Award } from '../AppIcon';

/** Static reference guide: KonMari rules + capsule targets. */
export default function CapsuleTab() {
  return (
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
  );
}
