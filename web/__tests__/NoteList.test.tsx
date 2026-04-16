import { fireEvent, render, screen } from '@testing-library/react';
import { NoteList } from '../app/components/NoteList';
import type { NoteListItem } from '../app/types';

const items: NoteListItem[] = [
  {
    path: 'ruby/metaprogramming/method_lookup_path.md',
    title: 'Ruby method lookup path',
    mtime: '2026-01-01',
    mtime_epoch: 1,
    preview: '### Ruby method lookup path\nOrder: singleton → class → modules',
  },
  {
    path: 'frontend/react/hooks.md',
    title: 'React hooks',
    mtime: '2026-01-02',
    mtime_epoch: 2,
    preview: '### React hooks\nuseState, useEffect basics',
  },
];

describe('NoteList', () => {
  it('renders one row per item with title and path', () => {
    const { container } = render(
      <NoteList items={items} onSelect={() => {}} query="" selectedPath={null} isCompact={false} />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('Ruby method lookup path');
    expect(text).toContain('React hooks');
    expect(text).toContain('ruby/metaprogramming/method_lookup_path.md');
  });

  it('fires onSelect with the path when a row is pressed', () => {
    const onSelect = jest.fn();
    render(
      <NoteList items={items} onSelect={onSelect} query="" selectedPath={null} isCompact={false} />,
    );
    const row = screen.getByLabelText('Open Ruby method lookup path');
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith('ruby/metaprogramming/method_lookup_path.md');
  });

  it('shows preview only when query has text', () => {
    const noQuery = render(
      <NoteList items={items} onSelect={() => {}} query="" selectedPath={null} isCompact={false} />,
    );
    expect(noQuery.container.textContent ?? '').not.toContain('useState, useEffect basics');

    const withQuery = render(
      <NoteList items={items} onSelect={() => {}} query="react" selectedPath={null} isCompact={false} />,
    );
    expect(withQuery.container.textContent ?? '').toContain('useState, useEffect basics');
  });

  it('wraps each matched term in its own span so it can be visually highlighted', () => {
    const { container } = render(
      <NoteList
        items={items}
        onSelect={() => {}}
        query="ruby method"
        selectedPath={null}
        isCompact={false}
      />,
    );
    // highlight() splits text on matched terms and wraps each match in a
    // dedicated <Text> (react-native-web compiles to <span>). So the
    // terms "ruby" and "method" should appear as their own <span> nodes
    const spanTexts = Array.from(container.querySelectorAll('span'))
      .map((s) => (s.textContent ?? '').toLowerCase().trim())
      .filter(Boolean);
    expect(spanTexts).toEqual(expect.arrayContaining(['ruby']));
    expect(spanTexts).toEqual(expect.arrayContaining(['method']));
  });
});
