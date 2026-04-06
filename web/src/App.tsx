import { useState, useCallback } from 'react';
import { Layout } from './components/Layout';
import { NoteList } from './components/NoteList';
import { NoteViewer } from './components/NoteViewer';
import { NoteEditor } from './components/NoteEditor';
import { NoteCreator } from './components/NoteCreator';
import { DeleteConfirm } from './components/DeleteConfirm';
import { useNotes } from './hooks/useNotes';
import { useSearch } from './hooks/useSearch';
import { useNote } from './hooks/useNote';
import { deleteNote } from './api';

type View = 'list' | 'view' | 'edit' | 'create';

export default function App() {
  const [view, setView] = useState<View>('list');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const { notes, loading: notesLoading, refresh } = useNotes();
  const { results: searchResults, searching } = useSearch(searchQuery);
  const { note, loading: noteLoading, refetch } = useNote(view === 'view' || view === 'edit' ? selectedPath : null);

  const displayNotes = searchQuery.trim() ? searchResults : notes;

  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path);
    setView('view');
  }, []);

  const handleNewNote = useCallback(() => {
    setView('create');
    setSelectedPath(null);
  }, []);

  const handleCreated = useCallback((path: string) => {
    refresh();
    setSelectedPath(path);
    setView('view');
  }, [refresh]);

  const handleSaved = useCallback(() => {
    refresh();
    refetch();
    setView('view');
  }, [refresh, refetch]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedPath) return;
    try {
      await deleteNote(selectedPath);
      setShowDelete(false);
      setSelectedPath(null);
      setView('list');
      refresh();
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete note');
    }
  }, [selectedPath, refresh]);

  function renderMain() {
    if (view === 'create') {
      return <NoteCreator onCreated={handleCreated} onCancel={() => setView('list')} />;
    }

    if ((view === 'view' || view === 'edit') && noteLoading) {
      return <div className="main-placeholder">Loading...</div>;
    }

    if (view === 'edit' && note && selectedPath) {
      return (
        <NoteEditor
          path={selectedPath}
          initialContent={note.content}
          onSaved={handleSaved}
          onCancel={() => setView('view')}
        />
      );
    }

    if (view === 'view' && note) {
      return (
        <NoteViewer
          note={note}
          onEdit={() => setView('edit')}
          onDelete={() => setShowDelete(true)}
        />
      );
    }

    return (
      <div className="main-placeholder">
        {notesLoading || searching ? 'Loading...' : 'Select a note to view'}
      </div>
    );
  }

  return (
    <>
      <Layout
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onNewNote={handleNewNote}
        sidebar={
          <NoteList
            notes={displayNotes}
            selectedPath={selectedPath}
            onSelect={handleSelect}
          />
        }
        main={renderMain()}
      />
      {showDelete && selectedPath && (
        <DeleteConfirm
          notePath={selectedPath}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </>
  );
}
