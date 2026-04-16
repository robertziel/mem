import { render } from '@testing-library/react';
import { MarkdownRenderer } from '../app/components/MarkdownRenderer';

describe('MarkdownRenderer (web)', () => {
  it('renders a heading', () => {
    const { container } = render(<MarkdownRenderer content={'# Hello\n\nbody'} />);
    expect(container.querySelector('h1')?.textContent).toBe('Hello');
    expect(container.textContent).toContain('body');
  });

  it('renders **bold** and *italic* inline', () => {
    const { container } = render(
      <MarkdownRenderer content={'This is **bold** and *italic* text.'} />,
    );
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
  });

  it('renders bullet lists', () => {
    const { container } = render(<MarkdownRenderer content={'- a\n- b\n- c'} />);
    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toBe('a');
  });

  it('renders GFM tables', () => {
    const md = `| h1 | h2 |\n|----|----|\n| a  | b  |`;
    const { container } = render(<MarkdownRenderer content={md} />);
    expect(container.querySelector('table')).toBeTruthy();
    expect(container.querySelectorAll('th')).toHaveLength(2);
    expect(container.querySelectorAll('td')).toHaveLength(2);
  });

  it('renders fenced code blocks with language class', () => {
    const md = '```js\nconst x = 1;\n```';
    const { container } = render(<MarkdownRenderer content={md} />);
    const code = container.querySelector('pre code');
    expect(code).toBeTruthy();
    expect(code?.className).toMatch(/language-js|hljs/);
  });

  it('renders inline `code`', () => {
    const { container } = render(<MarkdownRenderer content={'use `foo` here'} />);
    // inline code is <code> NOT inside <pre>
    const inlineCodes = Array.from(container.querySelectorAll('code')).filter(
      (c) => c.parentElement?.tagName !== 'PRE',
    );
    expect(inlineCodes[0]?.textContent).toBe('foo');
  });

  it('renders autolinks (GFM)', () => {
    const { container } = render(<MarkdownRenderer content={'Visit https://example.com today.'} />);
    const link = container.querySelector('a');
    expect(link?.href).toContain('example.com');
  });

  it('does not throw on empty content', () => {
    expect(() => render(<MarkdownRenderer content={''} />)).not.toThrow();
  });
});
