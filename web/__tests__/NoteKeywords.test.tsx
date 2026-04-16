import { render } from '@testing-library/react';
import { NoteKeywords, extractKeywords } from '../app/components/NoteKeywords';

type SearchPathParts = {
  top_dir: string;
  subdirs: string[];
  filename_stem: string;
  filename_keywords: string[];
};

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS — detail pane must surface path keywords
// (top dir + subdirs + filename tokens) instead of an "Updated {date}" row.
// Keywords are the user-meaningful labels for the note; mtime is plumbing.
// ---------------------------------------------------------------------------
describe('extractKeywords', () => {
  it('flattens top_dir + subdirs + filename_keywords in that order', () => {
    const pathParts: SearchPathParts = {
      top_dir: 'ruby',
      subdirs: ['metaprogramming'],
      filename_stem: 'method_lookup_path',
      filename_keywords: ['method', 'lookup', 'path'],
    };
    expect(extractKeywords(pathParts)).toEqual([
      'ruby',
      'metaprogramming',
      'method',
      'lookup',
      'path',
    ]);
  });

  it('dedupes case-insensitively while preserving first occurrence', () => {
    const pathParts: SearchPathParts = {
      top_dir: 'ruby',
      subdirs: ['ruby', 'metaprogramming'],
      filename_stem: 'ruby_method',
      filename_keywords: ['ruby', 'method'],
    };
    expect(extractKeywords(pathParts)).toEqual(['ruby', 'metaprogramming', 'method']);
  });

  it('drops empty strings and trims', () => {
    const pathParts: SearchPathParts = {
      top_dir: '',
      subdirs: ['', ' devops '],
      filename_stem: 'docker',
      filename_keywords: ['docker', ''],
    };
    expect(extractKeywords(pathParts)).toEqual(['devops', 'docker']);
  });
});

describe('NoteKeywords component', () => {
  it('renders a chip for every keyword', () => {
    const pathParts: SearchPathParts = {
      top_dir: 'ruby',
      subdirs: ['metaprogramming'],
      filename_stem: 'method_lookup_path',
      filename_keywords: ['method', 'lookup', 'path'],
    };
    const { container } = render(<NoteKeywords pathParts={pathParts} />);
    const text = container.textContent ?? '';
    expect(text).toContain('ruby');
    expect(text).toContain('metaprogramming');
    expect(text).toContain('method');
    expect(text).toContain('lookup');
    expect(text).toContain('path');
    // Crucially: the word "Updated" must NOT appear — that was the old UI
    expect(text).not.toContain('Updated');
  });

  it('does not render when path_parts yields zero keywords', () => {
    const pathParts: SearchPathParts = {
      top_dir: '',
      subdirs: [],
      filename_stem: '',
      filename_keywords: [],
    };
    const { container } = render(<NoteKeywords pathParts={pathParts} />);
    expect((container.textContent ?? '').trim()).toBe('');
  });
});
