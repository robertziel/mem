import { browseDirectoryFromSeed } from '../app/search';
import type { SeedNote } from '../app/types';

function makeNote(path: string): SeedNote {
  const parts = path.split('/');
  const filename = parts[parts.length - 1].replace(/\.md$/, '');
  return {
    path,
    title: filename,
    content: '',
    mtime: '2026-01-01',
    mtime_epoch: 1,
    preview_source: '',
    path_parts: {
      top_dir: parts.length > 1 ? parts[0].toLowerCase() : '',
      subdirs: parts.length > 2 ? parts.slice(1, -1).map((s) => s.toLowerCase()) : [],
      filename_stem: filename.toLowerCase(),
      filename_keywords: filename.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
    },
  };
}

const corpus: SeedNote[] = [
  makeNote('ruby/metaprogramming/prepend/method_wrapping.md'),
  makeNote('ruby/metaprogramming/prepend/mixin_strategy.md'),
  makeNote('ruby/metaprogramming/method_lookup_path.md'),
  makeNote('ruby/metaprogramming/define_method.md'),
  makeNote('ruby/core/blocks_lambda_proc.md'),
  makeNote('ruby/core/let_the_method.md'),
  makeNote('rails/testing/rspec_let_let_bang.md'),
  makeNote('frontend/react/hooks.md'),
  makeNote('frontend/react/suspense.md'),
];

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS — when search terms exactly match an existing
// directory path (in order, segment by segment), show that directory's
// immediate subdirs + files. Any non-matching or partial term falls back
// to null (caller then uses the normal search path).
// ---------------------------------------------------------------------------
describe('browseDirectoryFromSeed', () => {
  it('returns null for empty terms', () => {
    expect(browseDirectoryFromSeed(corpus, [])).toBeNull();
  });

  it('returns null when no note matches the full path prefix', () => {
    expect(browseDirectoryFromSeed(corpus, ['ruby', 'xyz'])).toBeNull();
    expect(browseDirectoryFromSeed(corpus, ['nope'])).toBeNull();
  });

  it('single top_dir: lists immediate child subdirs with counts and files directly under it', () => {
    const view = browseDirectoryFromSeed(corpus, ['ruby']);
    expect(view).not.toBeNull();
    expect(view!.path).toBe('ruby');
    // metaprogramming contains 4 notes (incl. 2 under prepend/), core contains 2
    const subdirByName = Object.fromEntries(view!.subdirs.map((s) => [s.name, s.count]));
    expect(subdirByName).toEqual({ metaprogramming: 4, core: 2 });
    // No files live directly under ruby/ in the corpus
    expect(view!.notes.map((n) => n.path)).toEqual([]);
  });

  it('two segments: lists child subdirs AND files directly in that dir', () => {
    const view = browseDirectoryFromSeed(corpus, ['ruby', 'metaprogramming']);
    expect(view).not.toBeNull();
    expect(view!.path).toBe('ruby/metaprogramming');
    expect(view!.subdirs.map((s) => s.name)).toEqual(['prepend']);
    expect(view!.subdirs[0].count).toBe(2);
    expect(view!.notes.map((n) => n.path).sort()).toEqual(
      [
        'ruby/metaprogramming/method_lookup_path.md',
        'ruby/metaprogramming/define_method.md',
      ].sort(),
    );
  });

  it('matches case-insensitively', () => {
    const view = browseDirectoryFromSeed(corpus, ['RUBY', 'Metaprogramming']);
    expect(view?.path).toBe('ruby/metaprogramming');
    expect(view?.subdirs.map((s) => s.name)).toEqual(['prepend']);
  });

  it('rejects partial segment matches (e.g. "meta" is NOT the same as "metaprogramming")', () => {
    expect(browseDirectoryFromSeed(corpus, ['ruby', 'meta'])).toBeNull();
  });

  it('terminal dir: subdirs empty, only files listed', () => {
    const view = browseDirectoryFromSeed(corpus, ['frontend', 'react']);
    expect(view?.subdirs).toEqual([]);
    expect(view?.notes.map((n) => n.path).sort()).toEqual(
      ['frontend/react/hooks.md', 'frontend/react/suspense.md'].sort(),
    );
  });

  it('subdirs sorted by count desc, then name asc', () => {
    const expanded: SeedNote[] = [
      ...corpus,
      // add notes so frontend has TWO subdirs, react=2, network=1
      makeNote('frontend/network/cors.md'),
    ];
    const view = browseDirectoryFromSeed(expanded, ['frontend']);
    expect(view?.subdirs.map((s) => s.name)).toEqual(['react', 'network']);
  });
});
