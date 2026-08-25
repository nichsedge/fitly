'use client';

import React, { useState, useEffect } from 'react';
import { uuidv4 } from '../lib/id';
import { useWardrobe } from '../contexts/WardrobeContext';
import { CustomTag } from '../lib/types';
import Toast from './Toast';
import { Edit, Trash2, X } from './AppIcon';

interface Props {
  onClose: () => void;
}

export default function TagsManagerModal({ onClose }: Props) {
  const { tags, addTag, updateTag, deleteTag } = useWardrobe();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  const [newTagLabel, setNewTagLabel] = useState('');
  const [editingTag, setEditingTag] = useState<CustomTag | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [toast, setToast] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagLabel.trim()) return;
    
    const exists = tags.find(t => t.label.toLowerCase() === newTagLabel.trim().toLowerCase());
    if (exists) {
      setToast('Tag already exists');
      return;
    }

    await addTag({ id: uuidv4(), label: newTagLabel.trim() });
    setNewTagLabel('');
    setToast('Tag added');
  };

  const startEdit = (tag: CustomTag) => {
    setEditingTag(tag);
    setEditLabel(tag.label);
  };

  const handleUpdate = async () => {
    if (!editingTag || !editLabel.trim()) return;
    if (editLabel.trim() === editingTag.label) {
      setEditingTag(null);
      return;
    }

    await updateTag({ ...editingTag, label: editLabel.trim() }, editingTag.label);
    setEditingTag(null);
    setToast('Tag updated');
  };

  const handleDelete = async (tag: CustomTag) => {
    if (confirm(`Are you sure you want to delete "${tag.label}"? This style will be removed from all associated items.`)) {
      await deleteTag(tag.id, tag.label);
      setToast('Tag deleted');
    }
  };

  return (
    <div className="modal-overlay tags-manager-overlay" onClick={onClose}>
      <div className="modal-sheet animate-slide-up" onClick={e => e.stopPropagation()} style={{ maxHeight: '80dvh' }}>
        <div className="modal-header">
          <span className="modal-title">Manage Tags</span>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            Add or edit your wardrobe styles. Deleting a tag removes it from all your items.
          </p>

          {/* Add Form */}
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="New tag label (e.g. Vintage)" 
              value={newTagLabel}
              onChange={e => setNewTagLabel(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
              Add
            </button>
          </form>

          {/* Tags List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {tags.map(tag => (
              <div key={tag.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '12px var(--space-4)',
                background: 'var(--bg-2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
              }}>
                {editingTag?.id === tag.id ? (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flex: 1 }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editLabel}
                      autoFocus
                      onChange={e => setEditLabel(e.target.value)}
                      style={{ flex: 1, padding: '4px 8px' }}
                    />
                    <button className="btn btn-primary" onClick={handleUpdate} style={{ padding: '4px 12px', fontSize: 13 }}>
                      Save
                    </button>
                    <button className="btn btn-ghost" onClick={() => setEditingTag(null)} style={{ padding: '4px 12px', fontSize: 13 }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{tag.label}</span>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button 
                        className="btn-circle" 
                        onClick={() => startEdit(tag)}
                        style={{ width: 32, height: 32, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        className="btn-circle" 
                        onClick={() => handleDelete(tag)}
                        style={{ width: 32, height: 32, fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  );
}
