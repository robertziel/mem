import { useState, useEffect, useCallback } from 'react';
import type { NoteDetail } from '../types';
import { getNote } from '../api';

export function useNote(path: string | null) {
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) {
      setNote(null);
      return;
    }
    setLoading(true);
    getNote(path)
      .then(setNote)
      .catch((err) => {
        console.error('Failed to load note:', err);
        setNote(null);
      })
      .finally(() => setLoading(false));
  }, [path, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  return { note, loading, setNote, refetch };
}
