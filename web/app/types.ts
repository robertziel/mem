export type SearchPathParts = {
  top_dir: string;
  subdirs: string[];
  filename_stem: string;
  filename_keywords: string[];
};

export type SeedNote = {
  path: string;
  title: string;
  mtime: string;
  mtime_epoch: number;
  content: string;
  path_parts: SearchPathParts;
  preview_source: string;
};

export type SeedPayload = {
  notes: SeedNote[];
};

export type SeedMeta = {
  seed_version: number;
  generated_at: string;
  note_count: number;
  server_run_id: string;
  source_dir: string;
};

export type NoteSummary = Pick<SeedNote, 'path' | 'title' | 'mtime' | 'mtime_epoch'>;

export type SearchResult = NoteSummary & {
  score: number;
  preview: string;
  sort_key: [number, number, number, number];
};

export type NoteListItem = NoteSummary & {
  preview?: string;
};

export type Category = {
  /** Canonical (lower-cased) top-level directory. */
  name: string;
  /** How many seeded notes live under this top_dir. */
  count: number;
};

/**
 * Shape returned when the user's query exactly matches an existing path
 * prefix (ie. they are browsing a directory rather than running a search).
 */
export type DirectoryView = {
  /** Canonical slash-joined path matched by the query (e.g. "ruby/metaprogramming"). */
  path: string;
  /** Immediate child directories of this path, with note counts. */
  subdirs: Category[];
  /** Notes that live directly at this path (no further subdir nesting). */
  notes: NoteSummary[];
};

export interface NoteRepository {
  initialize(): Promise<SeedMeta>;
  listNotes(limit: number): Promise<NoteSummary[]>;
  listCategories(): Promise<Category[]>;
  browseDirectory(terms: string[]): Promise<DirectoryView | null>;
  searchNotes(query: string): Promise<SearchResult[]>;
  getNote(path: string): Promise<SeedNote | null>;
}
