'use client';

import React, { useEffect } from 'react';
import { CATEGORIES, Category, COLORS } from '../lib/types';
import { useSettings } from '../contexts/SettingsContext';
import { CategoryIcon, X, Sliders, Tag, Palette, Check } from './AppIcon';

interface FilterSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeCategory: Category | 'all';
    activeTag: string;
    activeStatus: string;
    activeCondition: string;
    activeColor: string;
    tags: { id: string; label: string }[];
    onCategoryChange: (cat: Category | 'all') => void;
    onTagChange: (tag: string) => void;
    onStatusChange: (status: string) => void;
    onConditionChange: (condition: string) => void;
    onColorChange: (color: string) => void;
    onReset: () => void;
    hasActiveFilters: boolean;
}

const STATUS_OPTIONS = [
    { value: 'all', icon: '✨', key: 'allStatus' },
    { value: 'ready', icon: '✅', key: 'ready' },
    { value: 'dirty', icon: '🧺', key: 'dirty' },
    { value: 'cleaning', icon: '🧼', key: 'cleaning' },
];

const CONDITION_OPTIONS = [
    { value: 'all', key: 'allConditions' },
    { value: 'new', key: 'condNew' },
    { value: 'excellent', key: 'condExcellent' },
    { value: 'good', key: 'condGood' },
    { value: 'fair', key: 'condFair' },
    { value: 'poor', key: 'condPoor' },
    { value: 'needs-repair', key: 'condRepair' },
];

export default function FilterSheetModal({
    isOpen,
    onClose,
    activeCategory,
    activeTag,
    activeStatus,
    activeCondition,
    activeColor,
    tags,
    onCategoryChange,
    onTagChange,
    onStatusChange,
    onConditionChange,
    onColorChange,
    onReset,
    hasActiveFilters,
}: FilterSheetModalProps) {
    const { t } = useSettings();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Filter wardrobe items">
            <div
                className="filter-sheet"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-handle" />

                <div className="filter-sheet__header">
                    <div className="filter-sheet__title-wrap">
                        <h3 className="filter-sheet__title">
                            <Sliders size={18} />
                            <span>{t('filters')}</span>
                        </h3>
                        {hasActiveFilters && (
                            <button className="filter-sheet__reset" onClick={onReset}>
                                {t('clearAll')}
                            </button>
                        )}
                    </div>
                    <button className="modal-close" onClick={onClose} aria-label="Close filters">
                        <X size={18} />
                    </button>
                </div>

                <div className="filter-sheet__body">
                    {/* Category */}
                    <div className="filter-sheet__section">
                        <div className="filter-sheet__label">
                            <CategoryIcon category={activeCategory === 'all' ? 'top' : activeCategory} size={14} />
                            <span>{t('category')}</span>
                        </div>
                        <div className="filter-sheet__chips">
                            <button
                                className={`filter-chip ${activeCategory === 'all' ? 'active' : ''}`}
                                onClick={() => onCategoryChange('all')}
                                aria-pressed={activeCategory === 'all'}
                            >
                                {t('all')}
                            </button>
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    className={`filter-chip ${activeCategory === cat.value ? 'active' : ''}`}
                                    onClick={() => onCategoryChange(cat.value)}
                                    aria-pressed={activeCategory === cat.value}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                >
                                    <CategoryIcon category={cat.value} size={14} />
                                    <span>{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color */}
                    <div className="filter-sheet__section">
                        <div className="filter-sheet__label">
                            <Palette size={14} />
                            <span>{t('color')}</span>
                        </div>
                        <div className="filter-sheet__colors">
                            <button
                                className={`filter-chip ${activeColor === 'all' ? 'active' : ''}`}
                                onClick={() => onColorChange('all')}
                                aria-pressed={activeColor === 'all'}
                                style={{ fontSize: 12, padding: '4px 10px' }}
                            >
                                {t('all')}
                            </button>
                            {COLORS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => onColorChange(activeColor === c.value ? 'all' : c.value)}
                                    title={c.label}
                                    aria-label={c.label}
                                    aria-pressed={activeColor === c.value}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        backgroundColor: c.value,
                                        border: activeColor === c.value ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.2)',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        boxShadow: activeColor === c.value ? '0 0 8px var(--accent-glow)' : 'none',
                                        transition: 'transform 0.15s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {activeColor === c.value && <Check size={14} color="#fff" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status */}
                    <div className="filter-sheet__section">
                        <div className="filter-sheet__label">
                            <span>{t('status')}</span>
                        </div>
                        <div className="filter-sheet__chips">
                            {STATUS_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    className={`filter-chip ${activeStatus === opt.value ? 'active' : ''}`}
                                    onClick={() => onStatusChange(opt.value)}
                                    aria-pressed={activeStatus === opt.value}
                                >
                                    {opt.icon} {t(opt.key as any)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Condition */}
                    <div className="filter-sheet__section">
                        <div className="filter-sheet__label">
                            <span>{t('condition')}</span>
                        </div>
                        <div className="filter-sheet__chips">
                            {CONDITION_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    className={`filter-chip ${activeCondition === opt.value ? 'active' : ''}`}
                                    onClick={() => onConditionChange(opt.value)}
                                    aria-pressed={activeCondition === opt.value}
                                >
                                    {t(opt.key as any)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="filter-sheet__section">
                        <div className="filter-sheet__label">
                            <Tag size={14} />
                            <span>{t('styleTags')}</span>
                        </div>
                        <div className="filter-sheet__chips">
                            <button
                                className={`filter-chip ${activeTag === 'all' ? 'active' : ''}`}
                                onClick={() => onTagChange('all')}
                                aria-pressed={activeTag === 'all'}
                            >
                                {t('allStyles')}
                            </button>
                            {tags.map(tag => (
                                <button
                                    key={tag.id}
                                    className={`filter-chip ${activeTag === tag.label ? 'active' : ''}`}
                                    onClick={() => onTagChange(tag.label)}
                                    aria-pressed={activeTag === tag.label}
                                >
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="filter-sheet__footer">
                    <button className="btn btn-primary btn-full" onClick={onClose}>
                        {t('showResults')}
                    </button>
                </div>
            </div>
        </div>
    );
}