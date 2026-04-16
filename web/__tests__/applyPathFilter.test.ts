import { applyPathFilter } from '../app/search';

type Item = { path: string };

const corpus: Item[] = [
  { path: 'ruby/metaprogramming/method_lookup_path.md' },
  { path: 'ruby/core/blocks_lambda_proc.md' },
  { path: 'frontend/react/hooks.md' },
  { path: 'frontend/react/suspense.md' },
  { path: 'devops/docker/docker_compose.md' },
  { path: 'devops/kubernetes/k8s_services.md' },
];

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS — applyPathFilter narrows a result set down
// to items whose directory segments (everything before the filename) start
// with every segment in the pathFilter, in order, case-insensitively.
// Used by the filter-chip bar to apply the user's drilldown on flat-search
// results. Works on any shape with a `.path` string.
// ---------------------------------------------------------------------------
describe('applyPathFilter', () => {
  it('returns the input untouched when pathFilter is empty', () => {
    expect(applyPathFilter(corpus, [])).toEqual(corpus);
  });

  it('keeps only items matching the single-segment filter (top-level dir)', () => {
    const out = applyPathFilter(corpus, ['ruby']).map((n) => n.path);
    expect(out).toEqual([
      'ruby/metaprogramming/method_lookup_path.md',
      'ruby/core/blocks_lambda_proc.md',
    ]);
  });

  it('keeps only items matching the multi-segment filter in order', () => {
    const out = applyPathFilter(corpus, ['frontend', 'react']).map((n) => n.path);
    expect(out).toEqual(['frontend/react/hooks.md', 'frontend/react/suspense.md']);
  });

  it('matches case-insensitively', () => {
    const out = applyPathFilter(corpus, ['RUBY', 'CORE']).map((n) => n.path);
    expect(out).toEqual(['ruby/core/blocks_lambda_proc.md']);
  });

  it('rejects items whose directory depth is shorter than the filter depth', () => {
    const shallow: Item[] = [{ path: 'frontend/hooks.md' }];
    // pathFilter has 2 segments but the note only has 1 dir segment
    expect(applyPathFilter(shallow, ['frontend', 'react'])).toEqual([]);
  });

  it('returns [] when no item matches any segment of the filter', () => {
    expect(applyPathFilter(corpus, ['nonexistent'])).toEqual([]);
  });

  it('ignores root-level files (no directory) when any filter is present', () => {
    const mixed: Item[] = [
      { path: 'root_level.md' },
      { path: 'ruby/core/foo.md' },
    ];
    expect(applyPathFilter(mixed, ['ruby']).map((n) => n.path)).toEqual(['ruby/core/foo.md']);
  });
});
