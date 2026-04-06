import { useState } from 'react';
import { createNote } from '../api';

interface Props {
  onCreated: (path: string) => void;
  onCancel: () => void;
}

export function NoteCreator({ onCreated, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const result = await createNote({ title, tags, body });
      onCreated(result.path);
    } catch (err) {
      console.error('Failed to create note:', err);
      alert('Failed to create note');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="note-creator">
      <h2>New Note</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            autoFocus
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="tags">Tags (comma-separated)</label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. react, hooks, patterns"
          />
        </div>
        <div className="form-field">
          <label htmlFor="body">Body</label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your note in Markdown..."
            rows={16}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
            {saving ? 'Creating...' : 'Create Note'}
          </button>
        </div>
      </form>
    </div>
  );
}
