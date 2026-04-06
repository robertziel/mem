import type { Note, SearchResult, NoteDetail, NoteCreate } from './types';

const BASE = '/api';

export async function listNotes(limit = 50): Promise<Note[]> {
  const res = await fetch(`${BASE}/notes?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to list notes');
  return res.json();
}

export async function searchNotes(query: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/notes/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search notes');
  return res.json();
}

export async function getNote(path: string): Promise<NoteDetail> {
  const res = await fetch(`${BASE}/notes/${path}`);
  if (!res.ok) throw new Error('Note not found');
  return res.json();
}

export async function createNote(data: NoteCreate): Promise<{ path: string; filename: string }> {
  const res = await fetch(`${BASE}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create note');
  return res.json();
}

export async function updateNote(path: string, content: string): Promise<void> {
  const res = await fetch(`${BASE}/notes/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to update note');
}

export async function deleteNote(path: string): Promise<void> {
  const res = await fetch(`${BASE}/notes/${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete note');
}
