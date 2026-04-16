import { listCategoriesFromSeed } from '../app/search';
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
  makeNote('ruby/metaprogramming/method_lookup_path.md'),
  makeNote('ruby/core/let_the_method.md'),
  makeNote('ruby/core/blocks_lambda_proc.md'),
  makeNote('rails/testing/rspec_let_let_bang.md'),
  makeNote('rails/activerecord/batch_delete_find_each.md'),
  makeNote('devops/docker/docker_compose.md'),
  makeNote('devops/kubernetes/k8s_services.md'),
  makeNote('frontend/react/hooks.md'),
];

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS — when the search bar is empty the UI shows
// top-level directories (categories). This locks in the shape, counts,
// ordering, and edge cases of the pure function that drives that list.
// ---------------------------------------------------------------------------
describe('listCategoriesFromSeed', () => {
  it('returns a distinct list of top-level directories with note counts', () => {
    const out = listCategoriesFromSeed(corpus);
    const byName = Object.fromEntries(out.map((c) => [c.name, c.count]));
    expect(byName).toEqual({
      ruby: 3,
      rails: 2,
      devops: 2,
      frontend: 1,
    });
  });

  it('sorts descending by count, then alphabetically for ties', () => {
    const out = listCategoriesFromSeed(corpus);
    expect(out.map((c) => c.name)).toEqual(['ruby', 'devops', 'rails', 'frontend']);
  });

  it('returns an empty array for an empty corpus', () => {
    expect(listCategoriesFromSeed([])).toEqual([]);
  });

  it('ignores notes that have no top_dir (root-level files)', () => {
    const out = listCategoriesFromSeed([
      makeNote('root_level_note.md'),
      makeNote('ruby/core/foo.md'),
    ]);
    expect(out.map((c) => c.name)).toEqual(['ruby']);
  });

  it('treats top_dir comparison case-insensitively (dedupes RUBY vs ruby)', () => {
    const mixed: SeedNote[] = [
      { ...makeNote('ruby/a.md'), path_parts: { top_dir: 'Ruby', subdirs: [], filename_stem: 'a', filename_keywords: ['a'] } },
      { ...makeNote('RUBY/b.md'), path_parts: { top_dir: 'RUBY', subdirs: [], filename_stem: 'b', filename_keywords: ['b'] } },
      makeNote('frontend/c.md'),
    ];
    const out = listCategoriesFromSeed(mixed);
    const byName = Object.fromEntries(out.map((c) => [c.name.toLowerCase(), c.count]));
    expect(byName).toEqual({ ruby: 2, frontend: 1 });
  });
});
