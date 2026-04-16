import { fireEvent, render, screen } from '@testing-library/react';
import { CategoryList } from '../app/components/CategoryList';

type Category = { name: string; count: number };

const categories: Category[] = [
  { name: 'ruby', count: 42 },
  { name: 'devops', count: 18 },
  { name: 'frontend', count: 7 },
];

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS — CategoryList is what the user sees when the
// search bar is empty. Every category row must be tappable and call
// onSelect with the category name so App.tsx can use it as a search term.
// ---------------------------------------------------------------------------
describe('CategoryList', () => {
  it('renders a row per category with its note count', () => {
    const { container } = render(
      <CategoryList categories={categories} onSelect={() => {}} />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('ruby');
    expect(text).toContain('42');
    expect(text).toContain('devops');
    expect(text).toContain('18');
    expect(text).toContain('frontend');
    expect(text).toContain('7');
  });

  it('calls onSelect with the category name when a row is pressed', () => {
    const onSelect = jest.fn();
    render(<CategoryList categories={categories} onSelect={onSelect} />);
    const row = screen.getByLabelText('Open category ruby');
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith('ruby');
  });

  it('renders an empty state when there are no categories', () => {
    const { container } = render(
      <CategoryList categories={[]} onSelect={() => {}} />,
    );
    expect((container.textContent ?? '').toLowerCase()).toContain('no categories');
  });

  it('exposes every category row under a stable aria-label pattern', () => {
    render(<CategoryList categories={categories} onSelect={() => {}} />);
    for (const c of categories) {
      expect(screen.getByLabelText(`Open category ${c.name}`)).toBeTruthy();
    }
  });
});
