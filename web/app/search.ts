import type { Category, NoteSummary, SearchResult, SeedNote } from './types';

type SearchMatch = {
  top_dir_matches: number;
  subdir_matches: number;
  filename_matches: number;
  content_matches: number;
  score: number;
  sort_key: [number, number, number, number];
  line_num: number | null;
};

export function normalizeSearchTerms(query: string): string[] {
  return query
    .split(/\s+/)
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

export function listNotesFromSeed(notes: SeedNote[], limit: number): NoteSummary[] {
  return [...notes]
    .sort((left, right) => right.mtime_epoch - left.mtime_epoch)
    .slice(0, limit)
    .map(toSummary);
}

/**
 * Group seeded notes by their top-level directory (lower-cased) and
 * return `{name, count}` rows sorted by count desc, then name asc.
 * Notes with no top_dir (root-level files) are ignored.
 */
export function listCategoriesFromSeed(notes: SeedNote[]): Category[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    const raw = note.path_parts?.top_dir;
    if (typeof raw !== 'string') continue;
    const name = raw.trim().toLowerCase();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function searchNotesFromSeed(notes: SeedNote[], query: string): SearchResult[] {
  const terms = normalizeSearchTerms(query);
  if (terms.length === 0) {
    return listNotesFromSeed(notes, 50).map((note) => ({
      ...note,
      preview: '',
      score: 0,
      sort_key: [0, 0, 0, 0],
    }));
  }

  return notes
    .map((note) => {
      const match = classifySearchMatch(note, terms);
      if (!match) {
        return null;
      }

      return {
        ...toSummary(note),
        preview: buildPreview(note.preview_source, match.line_num),
        score: match.score,
        sort_key: match.sort_key,
      } satisfies SearchResult;
    })
    .filter((note): note is SearchResult => Boolean(note))
    .sort((left, right) => {
      const sortKey = compareSortKeys(left.sort_key, right.sort_key);
      if (sortKey !== 0) {
        return sortKey;
      }
      return right.mtime_epoch - left.mtime_epoch;
    })
    .slice(0, 50);
}

function toSummary(note: SeedNote): NoteSummary {
  return {
    path: note.path,
    title: note.title,
    mtime: note.mtime,
    mtime_epoch: note.mtime_epoch,
  };
}

function compareSortKeys(
  left: [number, number, number, number],
  right: [number, number, number, number],
): number {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return right[index] - left[index];
    }
  }
  return 0;
}

function buildPreview(content: string, lineNum: number | null): string {
  const lines = content.split(/\r?\n/);
  const start = lineNum ?? 0;
  return lines
    .slice(start, start + 4)
    .join('\n')
    .trim();
}

function classifySearchMatch(note: SeedNote, terms: string[]): SearchMatch | null {
  let topDirMatches = 0;
  let subdirMatches = 0;
  let filenameMatches = 0;

  const topDir = note.path_parts.top_dir;
  const subdirs = note.path_parts.subdirs;
  const filenameStem = note.path_parts.filename_stem;
  const filenameKeywords = note.path_parts.filename_keywords;

  for (const term of terms) {
    // 1) Exact keyword match — highest priority.
    //    A "keyword" is a single dir segment or filename stem token.
    const exactKeywordMatch =
      filenameKeywords.includes(term) ||
      subdirs.includes(term) ||
      topDir === term;

    if (exactKeywordMatch) {
      if (filenameKeywords.includes(term)) {
        filenameMatches += 1;
      } else if (subdirs.includes(term)) {
        subdirMatches += 1;
      } else {
        topDirMatches += 1;
      }
      continue;
    }

    // 2) Prefix match on any keyword — lets partial typing work
    //    (e.g. "rub" matches "ruby", "met" matches "method").
    //    Prefix, NOT arbitrary substring, so short common tokens like
    //    "let" do NOT match "singleton" / "delete" / "palette" — only
    //    keywords that actually start with the term.
    if (topDir && topDir.startsWith(term)) {
      topDirMatches += 1;
      continue;
    }
    if (subdirs.some((subdir) => subdir.startsWith(term))) {
      subdirMatches += 1;
      continue;
    }
    if (filenameKeywords.some((keyword) => keyword.startsWith(term))) {
      filenameMatches += 1;
      continue;
    }

    // 3) For longer terms (>= 4 chars), allow mid-keyword substring
    //    match too — catches compound words the tokenizer didn't split
    //    (e.g. "graphql" inside a stem).
    if (term.length >= 4) {
      if (topDir && topDir.includes(term)) {
        topDirMatches += 1;
        continue;
      }
      if (subdirs.some((subdir) => subdir.includes(term))) {
        subdirMatches += 1;
        continue;
      }
      if (filenameStem.includes(term) || filenameKeywords.some((keyword) => keyword.includes(term))) {
        filenameMatches += 1;
        continue;
      }
    }

    // No match for this term → reject the note.
    return null;
  }

  return {
    top_dir_matches: topDirMatches,
    subdir_matches: subdirMatches,
    filename_matches: filenameMatches,
    content_matches: 0,
    score: topDirMatches * 1000 + subdirMatches * 100 + filenameMatches * 10,
    sort_key: [topDirMatches, subdirMatches, filenameMatches, 0],
    line_num: null,
  };
}
