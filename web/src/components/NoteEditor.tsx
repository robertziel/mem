import { useState } from 'react';
import { updateNote } from '../api';

interface Props {
  path: string;
  initialContent: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function NoteEditor({ path, initialContent, onSaved, onCancel }: Props) {
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateNote(path, content);
      onSaved();
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save note');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="note-editor">
      <div className="note-editor-toolbar">
        <span className="note-editor-path">{path}</span>
        <div className="note-editor-actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <textarea
        className="note-editor-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        autoFocus
      />
    </div>
  );
}
