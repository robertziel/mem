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
  // notes that exist only to pin down regression behavior
  makeNote({ path: 'devops/cloud_aws/aws_sqs_dead_letter_queue.md', mtime_epoch: 0 }),
  makeNote({ path: 'rails/activerecord/batch_delete_find_each.md', mtime_epoch: 0 }),
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

  it('matches "let" against every keyword that starts with "let"', () => {
    const out = searchNotesFromSeed(corpus, 'let');
    const paths = out.map((n) => n.path).sort();
    // Exact "let" keyword notes PLUS "letter"-prefix note (dead_letter_queue).
    // Explicit noise-guards live in the REGRESSION section below.
    expect(paths).toEqual(
      [
        'devops/cloud_aws/aws_sqs_dead_letter_queue.md',
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

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS
// ---------------------------------------------------------------------------
// These tests lock in the behavior that short, partial queries like "rub"
// find notes whose keywords START WITH the query (via prefix match), while
// short substrings that only appear MID-keyword (e.g. "let" inside
// "singleton", "delete") must still NOT match. Do not relax these tests
// without a conscious design change — they encode the balance between
// "find things when I type a prefix" and "don't flood me with noise".
// ---------------------------------------------------------------------------
describe('REGRESSION: partial prefix matching', () => {
  it('"rub" finds every ruby/* note via prefix (partial typing)', () => {
    const out = searchNotesFromSeed(corpus, 'rub');
    const paths = out.map((n) => n.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'ruby/metaprogramming/method_lookup_path.md',
        'ruby/core/let_the_method.md',
      ]),
    );
  });

  it('"rub" rejects notes with no keyword starting with "rub"', () => {
    const out = searchNotesFromSeed(corpus, 'rub');
    expect(out.map((n) => n.path)).not.toContain('devops/docker/docker_compose.md');
    expect(out.map((n) => n.path)).not.toContain('frontend/react/hooks.md');
  });

  it('"met" (3-char prefix) finds notes via keyword prefix (method, metaprogramming)', () => {
    const out = searchNotesFromSeed(corpus, 'met');
    expect(out.map((n) => n.path)).toContain('ruby/metaprogramming/method_lookup_path.md');
    expect(out.map((n) => n.path)).toContain('ruby/core/let_the_method.md');
  });

  it('"let" matches keywords starting with "let" (letter is a prefix match, keep this)', () => {
    const out = searchNotesFromSeed(corpus, 'let');
    const paths = out.map((n) => n.path);
    // Exact keyword "let" in rspec_let_let_bang + let_the_method
    expect(paths).toEqual(
      expect.arrayContaining([
        'rails/testing/rspec_let_let_bang.md',
        'ruby/core/let_the_method.md',
      ]),
    );
    // Prefix keyword "letter" in dead_letter_queue also matches — acceptable,
    // it's a legitimate surface area for the letter concept.
    expect(paths).toContain('devops/cloud_aws/aws_sqs_dead_letter_queue.md');
  });

  it('"let" must NOT match mid-keyword substrings (singleton, delete)', () => {
    const out = searchNotesFromSeed(corpus, 'let');
    const paths = out.map((n) => n.path);
    // "let" is a substring of "singleton" and "delete" but NOT a prefix
    // of any keyword in those filenames — these must stay out.
    expect(paths).not.toContain('design_patterns/singleton_single_instance.md');
    expect(paths).not.toContain('rails/activerecord/batch_delete_find_each.md');
  });

  it('single-char / empty terms do not explode or match every note', () => {
    // Empty query returns every note in the list (listNotesFromSeed
    // fallback); that is deliberate and documented.
    const all = searchNotesFromSeed(corpus, '');
    expect(all.length).toBe(corpus.length);

    // A single-char term is still a prefix match; make sure we do not
    // accidentally match unrelated notes because of permissive
    // substring fallback (substring only kicks in at >= 4 chars).
    const one = searchNotesFromSeed(corpus, 'z');
    expect(one).toHaveLength(0);
  });
});
