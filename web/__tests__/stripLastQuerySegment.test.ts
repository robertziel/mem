import { stripLastQuerySegment } from '../app/search';

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS — the Back button in the mobile bottom bar
// walks up the directory hierarchy by stripping the last whitespace
// segment from the search query. This helper drives that behavior.
// ---------------------------------------------------------------------------
describe('stripLastQuerySegment', () => {
  it('returns empty string for an already-empty query (idempotent root)', () => {
    expect(stripLastQuerySegment('')).toBe('');
    expect(stripLastQuerySegment('   ')).toBe('');
  });

  it('returns empty string for a single-term query (one step goes to root)', () => {
    expect(stripLastQuerySegment('ruby')).toBe('');
    expect(stripLastQuerySegment('  ruby  ')).toBe('');
  });

  it('drops the last whitespace-separated segment, keeping the rest', () => {
    expect(stripLastQuerySegment('ruby metaprogramming')).toBe('ruby');
    expect(stripLastQuerySegment('ruby metaprogramming prepend')).toBe(
      'ruby metaprogramming',
    );
  });

  it('collapses internal whitespace and trims before splitting', () => {
    expect(stripLastQuerySegment('  ruby   metaprogramming   prepend  ')).toBe(
      'ruby metaprogramming',
    );
  });

  it('is idempotent when applied repeatedly (walks up to root)', () => {
    let q = 'ruby metaprogramming prepend';
    q = stripLastQuerySegment(q);
    expect(q).toBe('ruby metaprogramming');
    q = stripLastQuerySegment(q);
    expect(q).toBe('ruby');
    q = stripLastQuerySegment(q);
    expect(q).toBe('');
    q = stripLastQuerySegment(q);
    expect(q).toBe('');
  });
});
