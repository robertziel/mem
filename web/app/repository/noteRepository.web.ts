import { openDB } from 'idb';

import { listCategoriesFromSeed, listNotesFromSeed, searchNotesFromSeed } from '../../app/search';
import type { NoteRepository, SeedMeta, SeedNote, SeedPayload } from '../../app/types';

const DB_NAME = 'mem-local-notes';
const DB_VERSION = 1;
const NOTE_STORE = 'notes';
const META_STORE = 'meta';

let initializePromise: Promise<SeedMeta> | null = null;

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(NOTE_STORE)) {
      db.createObjectStore(NOTE_STORE, { keyPath: 'path' });
    }
    if (!db.objectStoreNames.contains(META_STORE)) {
      db.createObjectStore(META_STORE);
    }
  },
});

async function fetchSeedMeta(): Promise<SeedMeta> {
  const response = await fetch('/seed.meta.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load seed metadata (${response.status})`);
  }
  return (await response.json()) as SeedMeta;
}

async function fetchSeedPayload(): Promise<SeedPayload> {
  const response = await fetch('/seed.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load seed payload (${response.status})`);
  }
  return (await response.json()) as SeedPayload;
}

async function importSeedIfNeeded(): Promise<SeedMeta> {
  const [db, remoteMeta] = await Promise.all([dbPromise, fetchSeedMeta()]);
  const cachedMeta = (await db.get(META_STORE, 'seed_meta')) as SeedMeta | undefined;

  if (!cachedMeta || cachedMeta.server_run_id !== remoteMeta.server_run_id) {
    const payload = await fetchSeedPayload();
    const tx = db.transaction([NOTE_STORE, META_STORE], 'readwrite');
    const noteStore = tx.objectStore(NOTE_STORE);
    const metaStore = tx.objectStore(META_STORE);

    await noteStore.clear();
    for (const note of payload.notes) {
      await noteStore.put(note);
    }
    await metaStore.clear();
    await metaStore.put(remoteMeta, 'seed_meta');
    await tx.done;
  }

  return remoteMeta;
}

async function getAllNotes(): Promise<SeedNote[]> {
  await noteRepository.initialize();
  const db = await dbPromise;
  return (await db.getAll(NOTE_STORE)) as SeedNote[];
}

export const noteRepository: NoteRepository = {
  initialize() {
    if (!initializePromise) {
      initializePromise = importSeedIfNeeded();
    }
    return initializePromise;
  },
  async listNotes(limit) {
    return listNotesFromSeed(await getAllNotes(), limit);
  },
  async listCategories() {
    return listCategoriesFromSeed(await getAllNotes());
  },
  async searchNotes(query) {
    return searchNotesFromSeed(await getAllNotes(), query);
  },
  async getNote(path) {
    await noteRepository.initialize();
    const db = await dbPromise;
    return ((await db.get(NOTE_STORE, path)) as SeedNote | undefined) ?? null;
  },
};
