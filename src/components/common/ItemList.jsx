import { useState } from 'react';
import {
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
  Plus,
  Flag,
  Info as InfoIcon,
  Image as ImageIcon,
  Zap,
} from 'lucide-react';
import QuestionForm from './QuestionForm.jsx';
import Button from './Button.jsx';

function itemLabel(item) {
  if (item.type === 'round-header') return item.text || 'Round header';
  if (item.type === 'info') return item.text || 'Info slide';
  if (item.type === 'image-slide') return item.mediaLabel || 'Full-screen image';
  if (item.type === 'html') return 'HTML question';
  return item.text || `[${item.type}]`;
}

function ItemIcon({ item }) {
  if (item.type === 'round-header')
    return <Flag size={14} style={{ color: 'var(--color-accent-primary)' }} />;
  if (item.type === 'info')
    return <InfoIcon size={14} style={{ color: 'var(--color-accent-primary)' }} />;
  if (item.type === 'image-slide')
    return <ImageIcon size={14} style={{ color: 'var(--color-accent-primary)' }} />;
  return null;
}

/**
 * Renders the full running order (questions + non-scored slides) with
 * add/edit/reorder/delete controls. Used inline in the setup wizard and
 * inside a modal mid-quiz — same component, same behaviour either way.
 */
export default function ItemList({ items, onAdd, onUpdate, onDelete, onMove }) {
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);

  const editingItem = items.find((q) => q.id === editingId);

  if (editingId) {
    return (
      <QuestionForm
        question={editingItem}
        onSave={(item) => {
          onUpdate(editingId, item);
          setEditingId(null);
        }}
        onCancel={() => setEditingId(null)}
      />
    );
  }

  if (adding) {
    return (
      <QuestionForm
        onSave={(item) => {
          onAdd(item);
          setAdding(false);
        }}
        onCancel={() => setAdding(false)}
      />
    );
  }

  return (
    <div className="stack gap-md">
      {items.length === 0 && (
        <p style={{ fontSize: 13 }}>Nothing in the running order yet. Add your first item below.</p>
      )}

      <ol className="stack gap-sm" style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item, index) => (
          <li key={item.id} className="row gap-sm panel-raised" style={{ padding: 10 }}>
            <span className="badge mono">{index + 1}</span>
            <ItemIcon item={item} />
            <span className="grow" style={{ fontSize: 13 }}>
              {itemLabel(item)}
            </span>
            {!item.isSlide && <span className="badge">Round {item.round}</span>}
            {!item.isSlide && <span className="badge">+{item.pointsCorrect} pts</span>}
            {item.tiebreaker && (
              <span className="badge badge-success">
                <Zap size={11} aria-hidden="true" /> Tiebreaker
              </span>
            )}
            <Button
              variant="ghost"
              className="btn-icon"
              onClick={() => onMove(item.id, -1)}
              aria-label="Move up"
            >
              <ArrowUp size={14} />
            </Button>
            <Button
              variant="ghost"
              className="btn-icon"
              onClick={() => onMove(item.id, 1)}
              aria-label="Move down"
            >
              <ArrowDown size={14} />
            </Button>
            <Button
              variant="ghost"
              className="btn-icon"
              onClick={() => setEditingId(item.id)}
              aria-label="Edit"
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              className="btn-icon"
              onClick={() => onDelete(item.id)}
              aria-label="Delete"
            >
              <Trash2 size={14} />
            </Button>
          </li>
        ))}
      </ol>

      <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
        Add to running order
      </Button>
    </div>
  );
}
