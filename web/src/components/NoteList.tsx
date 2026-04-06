import type { Note, SearchResult } from '../types';
import { NoteListItem } from './NoteListItem';

interface Props {
  notes: (Note | SearchResult)[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function isSearchResult(note: Note | SearchResult): note is SearchResult {
  return 'preview' in note;
}

export function NoteList({ notes, selectedPath, onSelect }: Props) {
  if (notes.length === 0) {
    return <div className="note-list-empty">No notes found</div>;
  }

  return (
    <div className="note-list">
      {notes.map((note) => (
        <NoteListItem
          key={note.path}
          title={note.title}
          path={note.path}
          mtime={note.mtime}
          preview={isSearchResult(note) ? note.preview : undefined}
          selected={note.path === selectedPath}
          onClick={() => onSelect(note.path)}
        />
      ))}
    </div>
  );
}
