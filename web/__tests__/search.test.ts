import {
  listNotesFromSeed,
  normalizeSearchTerms,
  searchNotesFromSeed,
} from '../app/search';
import type { SeedNote } from '../app/types';

function makeNote(partial: Partial<SeedNote> & { path: string }): SeedNote {
  const parts = partial.path.split('/');
  const filename = parts[parts.length - 1].replace(/\.md$/, '');
  return {
    path: partial.path,
    title: partial.title ?? filename,
    content: partial.content ?? '',
    mtime: partial.mtime ?? '2026-01-01',
    mtime_epoch: partial.mtime_epoch ?? 1704067200,
    preview_source: partial.preview_source ?? partial.content ?? '',
    path_parts: partial.path_parts ?? {
      top_dir: parts.length > 1 ? parts[0].toLowerCase() : '',
      subdirs: parts.length > 2 ? parts.slice(1, -1).map((s) => s.toLowerCase()) : [],
      filename_stem: filename.toLowerCase(),
      filename_keywords: filename.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
    },
  };
}

const corpus: SeedNote[] = [
  makeNote({ path: 'ruby/metaprogramming/method_lookup_path.md', mtime_epoch: 3 }),
  makeNote({ path: 'ruby/core/let_the_method.md', mtime_epoch: 2 }),
  makeNote({ path: 'rails/testing/rspec_let_let_bang.md', mtime_epoch: 5 }),
  makeNote({ path: 'design_patterns/singleton_single_instance.md', mtime_epoch: 4 }),
  makeNote({ path: 'devops/docker/docker_compose.md', mtime_epoch: 1 }),
  makeNote({ path: 'frontend/react/hooks.md', mtime_epoch: 6 }),
];

describe('normalizeSearchTerms', () => {
  it('splits on whitespace, lowercases, drops empties', () => {
    expect(normalizeSearchTerms('  Ruby   metaprogramming ')).toEqual([
      'ruby',
      'metaprogramming',
    ]);
  });

  it('returns empty array for blank input', () => {
    expect(normalizeSearchTerms('')).toEqual([]);
    expect(normalizeSearchTerms('   ')).toEqual([]);
  });
});

describe('listNotesFromSeed', () => {
  it('sorts by mtime_epoch desc and limits', () => {
    const out = listNotesFromSeed(corpus, 3);
    expect(out.map((n) => n.path)).toEqual([
      'frontend/react/hooks.md',
      'rails/testing/rspec_let_let_bang.md',
      'design_patterns/singleton_single_instance.md',
    ]);
  });
});

describe('searchNotesFromSeed', () => {
  it('returns all notes when query is empty', () => {
    const out = searchNotesFromSeed(corpus, '');
    expect(out.length).toBe(corpus.length);
  });

  it('matches exact keyword "let" (3 chars, requires exact segment match)', () => {
    const out = searchNotesFromSeed(corpus, 'let');
    const paths = out.map((n) => n.path).sort();
    expect(paths).toEqual(
      [
        'rails/testing/rspec_let_let_bang.md',
        'ruby/core/let_the_method.md',
      ].sort(),
    );
  });

  it('does not match "let" as a substring (e.g. in "singleton")', () => {
    const out = searchNotesFromSeed(corpus, 'let');
    const matchedSingleton = out.some(
      (n) => n.path === 'design_patterns/singleton_single_instance.md',
    );
    expect(matchedSingleton).toBe(false);
  });

  it('substring match kicks in for terms >= 4 chars', () => {
    const out = searchNotesFromSeed(corpus, 'meta');
    expect(out.map((n) => n.path)).toContain('ruby/metaprogramming/method_lookup_path.md');
  });

  it('rejects notes where any term misses path/filename (no content fallback)', () => {
    const out = searchNotesFromSeed(corpus, 'ruby docker');
    expect(out.length).toBe(0);
  });

  it('sorts top_dir matches above subdir above filename', () => {
    const out = searchNotesFromSeed(corpus, 'ruby');
    expect(out[0].path.startsWith('ruby/')).toBe(true);
  });

  it('two-term search requires both to match', () => {
    const out = searchNotesFromSeed(corpus, 'ruby metaprogramming');
    expect(out).toHaveLength(1);
    expect(out[0].path).toBe('ruby/metaprogramming/method_lookup_path.md');
  });
});
