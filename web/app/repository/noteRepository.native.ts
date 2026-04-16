import * as SQLite from 'expo-sqlite';

import { listCategoriesFromSeed, listNotesFromSeed, searchNotesFromSeed } from '../../app/search';
import type { NoteRepository, SeedMeta, SeedNote, SeedPayload } from '../../app/types';

const bundledSeed = require('../../assets/generated/seed.json') as SeedPayload;
const bundledMeta = require('../../assets/generated/seed.meta.json') as SeedMeta;

const DATABASE_NAME = 'mem-local.db';

type NoteRow = {
  path: string;
  title: string;
  mtime: string;
  mtime_epoch: number;
  content: string;
  preview_source: string;
  path_parts_json: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initializePromise: Promise<SeedMeta> | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  const db = await dbPromise;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      path TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      mtime TEXT NOT NULL,
      mtime_epoch REAL NOT NULL,
      content TEXT NOT NULL,
      preview_source TEXT NOT NULL,
      path_parts_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  return db;
}

function rowToNote(row: NoteRow): SeedNote {
  return {
    path: row.path,
    title: row.title,
    mtime: row.mtime,
    mtime_epoch: row.mtime_epoch,
    content: row.content,
    preview_source: row.preview_source,
    path_parts: JSON.parse(row.path_parts_json) as SeedNote['path_parts'],
  };
}

async function resetDatabase(): Promise<SeedMeta> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM notes;
    DELETE FROM meta;
  `);

  await db.withTransactionAsync(async () => {
    for (const note of bundledSeed.notes) {
      await db.runAsync(
        `INSERT INTO notes (
          path,
          title,
          mtime,
          mtime_epoch,
          content,
          preview_source,
          path_parts_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          note.path,
          note.title,
          note.mtime,
          note.mtime_epoch,
          note.content,
          note.preview_source,
          JSON.stringify(note.path_parts),
        ],
      );
    }
    await db.runAsync(
      'INSERT INTO meta (key, value) VALUES (?, ?)',
      ['seed_meta', JSON.stringify(bundledMeta)],
    );
  });

  return bundledMeta;
}

async function getAllNotes(): Promise<SeedNote[]> {
  await noteRepository.initialize();
  const db = await getDatabase();
  const rows = await db.getAllAsync<NoteRow>('SELECT * FROM notes');
  return rows.map(rowToNote);
}

export const noteRepository: NoteRepository = {
  initialize() {
    if (!initializePromise) {
      initializePromise = resetDatabase();
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
    const db = await getDatabase();
    const row = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE path = ?', path);
    return row ? rowToNote(row) : null;
  },
};
