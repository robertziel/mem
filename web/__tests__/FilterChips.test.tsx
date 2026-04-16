import { fireEvent, render, screen } from '@testing-library/react';
import { FilterChips } from '../app/components/FilterChips';

type Category = { name: string; count: number };

const options: Category[] = [
  { name: 'frontend', count: 5 },
  { name: 'rails', count: 3 },
  { name: 'devops', count: 1 },
];

// ---------------------------------------------------------------------------
// IMMUTABLE REGRESSION TESTS — FilterChips is the horizontal, scrollable
// filter bar above flat-search results. Shows an "All" chip, any selected
// breadcrumb segments, and the current-depth options. Every row is a
// button with a stable accessibility label so it can be driven from
// Playwright + Maestro.
// ---------------------------------------------------------------------------
describe('FilterChips', () => {
  it('renders an "All" chip plus a chip per option with its count', () => {
    const { container } = render(
      <FilterChips
        breadcrumb={[]}
        options={options}
        onPickOption={() => {}}
        onPopBreadcrumb={() => {}}
        onClearAll={() => {}}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('All');
    expect(text).toContain('frontend');
    expect(text).toContain('5');
    expect(text).toContain('rails');
    expect(text).toContain('3');
    expect(text).toContain('devops');
    expect(text).toContain('1');
  });

  it('renders breadcrumb segments in order before the option chips', () => {
    const { container } = render(
      <FilterChips
        breadcrumb={['frontend', 'react']}
        options={[{ name: 'hooks', count: 2 }]}
        onPickOption={() => {}}
        onPopBreadcrumb={() => {}}
        onClearAll={() => {}}
      />,
    );
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    const allIdx = text.indexOf('All');
    const frontendIdx = text.indexOf('frontend');
    const reactIdx = text.indexOf('react');
    const hooksIdx = text.indexOf('hooks');
    expect(allIdx).toBeGreaterThanOrEqual(0);
    expect(frontendIdx).toBeGreaterThan(allIdx);
    expect(reactIdx).toBeGreaterThan(frontendIdx);
    expect(hooksIdx).toBeGreaterThan(reactIdx);
  });

  it('calls onClearAll() when the All chip is tapped', () => {
    const onClearAll = jest.fn();
    render(
      <FilterChips
        breadcrumb={['frontend']}
        options={[]}
        onPickOption={() => {}}
        onPopBreadcrumb={() => {}}
        onClearAll={onClearAll}
      />,
    );
    fireEvent.click(screen.getByLabelText('Clear filter'));
    expect(onClearAll).toHaveBeenCalled();
  });

  it('calls onPickOption(name) when an option chip is tapped', () => {
    const onPickOption = jest.fn();
    render(
      <FilterChips
        breadcrumb={[]}
        options={options}
        onPickOption={onPickOption}
        onPopBreadcrumb={() => {}}
        onClearAll={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText('Filter by rails'));
    expect(onPickOption).toHaveBeenCalledWith('rails');
  });

  it('calls onPopBreadcrumb(depth) when a breadcrumb segment is tapped', () => {
    const onPopBreadcrumb = jest.fn();
    render(
      <FilterChips
        breadcrumb={['frontend', 'react']}
        options={[]}
        onPickOption={() => {}}
        onPopBreadcrumb={onPopBreadcrumb}
        onClearAll={() => {}}
      />,
    );
    fireEvent.click(screen.getByLabelText('Pop filter to frontend'));
    expect(onPopBreadcrumb).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByLabelText('Pop filter to react'));
    expect(onPopBreadcrumb).toHaveBeenCalledWith(2);
  });

  it('renders nothing when there are no options and no breadcrumb', () => {
    const { container } = render(
      <FilterChips
        breadcrumb={[]}
        options={[]}
        onPickOption={() => {}}
        onPopBreadcrumb={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect((container.textContent ?? '').trim()).toBe('');
  });
});
