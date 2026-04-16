import { drillOptions } from '../app/search';

type Item = { path: string };

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS — drillOptions walks the filter deeper while
// the filtered result set shares a single directory segment at the current
// depth. Returns the effective pathFilter (possibly grown by auto-drill)
// + the list of distinct next-level options with per-option counts.
// ---------------------------------------------------------------------------
describe('drillOptions', () => {
  it('returns existing filter + 2+ top-level options when pathFilter is empty and results split', () => {
    const items: Item[] = [
      { path: 'ruby/core/a.md' },
      { path: 'ruby/core/b.md' },
      { path: 'frontend/react/c.md' },
    ];
    const out = drillOptions(items, []);
    expect(out.pathFilter).toEqual([]);
    const byName = Object.fromEntries(out.options.map((o) => [o.name, o.count]));
    expect(byName).toEqual({ ruby: 2, frontend: 1 });
  });

  it('auto-drills when every result shares a single top-level dir', () => {
    const items: Item[] = [
      { path: 'ruby/metaprogramming/a.md' },
      { path: 'ruby/core/b.md' },
    ];
    const out = drillOptions(items, []);
    expect(out.pathFilter).toEqual(['ruby']);
    const byName = Object.fromEntries(out.options.map((o) => [o.name, o.count]));
    expect(byName).toEqual({ metaprogramming: 1, core: 1 });
  });

  it('at a non-empty filter, reports distinct next-depth options filtered to that prefix', () => {
    const items: Item[] = [
      { path: 'ruby/metaprogramming/a.md' },
      { path: 'ruby/metaprogramming/b.md' },
      { path: 'ruby/core/c.md' },
      { path: 'frontend/react/d.md' },
    ];
    const out = drillOptions(items, ['ruby']);
    expect(out.pathFilter).toEqual(['ruby']);
    const byName = Object.fromEntries(out.options.map((o) => [o.name, o.count]));
    expect(byName).toEqual({ metaprogramming: 2, core: 1 });
  });

  it('cascades through a chain of single-child dirs in one call', () => {
    const items: Item[] = [
      { path: 'frontend/react/hooks/a.md' },
      { path: 'frontend/react/hooks/b.md' },
    ];
    const out = drillOptions(items, []);
    // Every note lives under frontend/react/hooks/ so the filter grows three
    // levels in one pass; the remaining options are at depth 3 which is
    // beyond the filename — so no options are shown and the breadcrumb has
    // absorbed all three segments.
    expect(out.pathFilter).toEqual(['frontend', 'react', 'hooks']);
    expect(out.options).toEqual([]);
  });

  it('returns [] options when the filtered set has no notes deeper than the filter depth', () => {
    const items: Item[] = [
      { path: 'frontend/react/a.md' },
      { path: 'frontend/react/b.md' },
    ];
    const out = drillOptions(items, ['frontend', 'react']);
    expect(out.pathFilter).toEqual(['frontend', 'react']);
    expect(out.options).toEqual([]);
  });

  it('option counts reflect only the filtered subset, not the raw corpus', () => {
    const items: Item[] = [
      { path: 'frontend/react/d.md' },
      { path: 'frontend/react/e.md' },
      { path: 'frontend/angular/f.md' },
      { path: 'frontend/vue/g.md' },
      // These three are outside the filter; their counts must NOT appear
      { path: 'ruby/core/a.md' },
      { path: 'ruby/core/b.md' },
      { path: 'ruby/metaprogramming/c.md' },
    ];
    const out = drillOptions(items, ['frontend']);
    expect(out.pathFilter).toEqual(['frontend']);
    const byName = Object.fromEntries(out.options.map((o) => [o.name, o.count]));
    expect(byName).toEqual({ react: 2, angular: 1, vue: 1 });
  });

  it('options sort by count desc, then name asc', () => {
    const items: Item[] = [
      { path: 'a/alpha/x.md' },
      { path: 'a/beta/x.md' },
      { path: 'a/beta/y.md' },
      { path: 'a/gamma/x.md' },
    ];
    const out = drillOptions(items, ['a']);
    expect(out.options.map((o) => o.name)).toEqual(['beta', 'alpha', 'gamma']);
  });

  it('returns empty options / unchanged filter on an empty input set', () => {
    expect(drillOptions([], [])).toEqual({ pathFilter: [], options: [] });
    expect(drillOptions([], ['frontend'])).toEqual({ pathFilter: ['frontend'], options: [] });
  });
});
