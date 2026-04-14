import type { NoteSummary, SearchResult, SeedNote } from './types';

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
  let contentMatches = 0;
  const contentPositions: number[] = [];

  const topDir = note.path_parts.top_dir;
  const subdirs = note.path_parts.subdirs;
  const filenameStem = note.path_parts.filename_stem;
  const filenameKeywords = note.path_parts.filename_keywords;
  const textLower = note.preview_source.toLowerCase();

  for (const term of terms) {
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

    const position = textLower.indexOf(term);
    if (position >= 0) {
      contentMatches += 1;
      contentPositions.push(position);
      continue;
    }

    return null;
  }

  const lineNum =
    contentPositions.length > 0
      ? textLower.slice(0, Math.min(...contentPositions)).split('\n').length - 1
      : null;

  return {
    top_dir_matches: topDirMatches,
    subdir_matches: subdirMatches,
    filename_matches: filenameMatches,
    content_matches: contentMatches,
    score: topDirMatches * 1000 + subdirMatches * 100 + filenameMatches * 10 + contentMatches,
    sort_key: [topDirMatches, subdirMatches, filenameMatches, contentMatches],
    line_num: lineNum,
  };
}
