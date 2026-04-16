import { fireEvent, render, screen } from '@testing-library/react';
import { DirectoryBrowser } from '../app/components/DirectoryBrowser';

type DirView = {
  path: string;
  subdirs: { name: string; count: number }[];
  notes: { path: string; title: string; mtime: string; mtime_epoch: number }[];
};

const view: DirView = {
  path: 'ruby/metaprogramming',
  subdirs: [
    { name: 'prepend', count: 3 },
    { name: 'define_method', count: 2 },
  ],
  notes: [
    {
      path: 'ruby/metaprogramming/method_lookup_path.md',
      title: 'Method Lookup Path',
      mtime: '2026-04-10',
      mtime_epoch: 1,
    },
    {
      path: 'ruby/metaprogramming/open_classes.md',
      title: 'Open Classes',
      mtime: '2026-04-11',
      mtime_epoch: 2,
    },
  ],
};

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS — DirectoryBrowser is the UI that shows up
// when the user's search query is an exact directory path prefix. It must
// list subdirs (as categories) AND files (as note rows), and expose both
// via stable aria-labels so Maestro/Playwright can drive them.
// ---------------------------------------------------------------------------
describe('DirectoryBrowser', () => {
  it('shows the current path as a breadcrumb', () => {
    const { container } = render(
      <DirectoryBrowser view={view} onSubdirSelect={() => {}} onNoteSelect={() => {}} />,
    );
    expect(container.textContent ?? '').toContain('ruby/metaprogramming');
  });

  it('renders a row for every subdir using the "Open category" aria-label', () => {
    render(<DirectoryBrowser view={view} onSubdirSelect={() => {}} onNoteSelect={() => {}} />);
    expect(screen.getByLabelText('Open category prepend')).toBeTruthy();
    expect(screen.getByLabelText('Open category define_method')).toBeTruthy();
  });

  it('calls onSubdirSelect with the subdir name when a subdir row is pressed', () => {
    const onSubdirSelect = jest.fn();
    render(
      <DirectoryBrowser view={view} onSubdirSelect={onSubdirSelect} onNoteSelect={() => {}} />,
    );
    fireEvent.click(screen.getByLabelText('Open category prepend'));
    expect(onSubdirSelect).toHaveBeenCalledWith('prepend');
  });

  it('renders a row for every file using the "Open <title>" aria-label', () => {
    render(<DirectoryBrowser view={view} onSubdirSelect={() => {}} onNoteSelect={() => {}} />);
    expect(screen.getByLabelText('Open Method Lookup Path')).toBeTruthy();
    expect(screen.getByLabelText('Open Open Classes')).toBeTruthy();
  });

  it('calls onNoteSelect with the note path when a file row is pressed', () => {
    const onNoteSelect = jest.fn();
    render(<DirectoryBrowser view={view} onSubdirSelect={() => {}} onNoteSelect={onNoteSelect} />);
    fireEvent.click(screen.getByLabelText('Open Open Classes'));
    expect(onNoteSelect).toHaveBeenCalledWith('ruby/metaprogramming/open_classes.md');
  });

  it('gracefully renders a terminal dir (no subdirs, only files)', () => {
    const terminal: DirView = {
      path: 'frontend/react',
      subdirs: [],
      notes: [{ path: 'frontend/react/hooks.md', title: 'Hooks', mtime: '2026-04-01', mtime_epoch: 1 }],
    };
    render(<DirectoryBrowser view={terminal} onSubdirSelect={() => {}} onNoteSelect={() => {}} />);
    expect(screen.getByLabelText('Open Hooks')).toBeTruthy();
  });

  it('gracefully renders an empty dir (no subdirs, no notes) with a clear message', () => {
    const empty: DirView = { path: 'whatever', subdirs: [], notes: [] };
    const { container } = render(
      <DirectoryBrowser view={empty} onSubdirSelect={() => {}} onNoteSelect={() => {}} />,
    );
    expect((container.textContent ?? '').toLowerCase()).toContain('empty');
  });
});
