import type { NoteDetail } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Props {
  note: NoteDetail;
  onEdit: () => void;
  onDelete: () => void;
}

export function NoteViewer({ note, onEdit, onDelete }: Props) {
  return (
    <div className="note-viewer">
      <div className="note-viewer-toolbar">
        <div className="note-viewer-meta">
          <span className="note-viewer-path">{note.path}</span>
          <span className="note-viewer-date">{note.mtime}</span>
        </div>
        <div className="note-viewer-actions">
          <button className="btn btn-primary" onClick={onEdit}>Edit</button>
          <button className="btn btn-danger" onClick={onDelete}>Delete</button>
        </div>
      </div>
      <MarkdownRenderer content={note.content} />
    </div>
  );
}
