import React from 'react';

/**
 * A very small markdown-ish shim for unit tests. Supports just enough to
 * let component tests assert structural elements (headings, bold/italic,
 * lists, tables, code, autolinks). The real pipeline (with syntax
 * highlighting, GFM, etc.) is exercised by Playwright E2E in a real
 * browser.
 */
function inline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const patterns: Array<{ re: RegExp; render: (m: RegExpExecArray) => React.ReactNode }> = [
    { re: /`([^`]+)`/y, render: (m) => <code key={Math.random()}>{m[1]}</code> },
    { re: /\*\*([^*]+)\*\*/y, render: (m) => <strong key={Math.random()}>{m[1]}</strong> },
    { re: /\*([^*]+)\*/y, render: (m) => <em key={Math.random()}>{m[1]}</em> },
    { re: /(https?:\/\/\S+)/y, render: (m) => <a key={Math.random()} href={m[1]}>{m[1]}</a> },
  ];
  let i = 0;
  let buf = '';
  while (i < text.length) {
    let matched = false;
    for (const { re, render } of patterns) {
      re.lastIndex = i;
      const m = re.exec(text);
      if (m && m.index === i) {
        if (buf) parts.push(buf);
        buf = '';
        parts.push(render(m));
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      buf += text[i];
      i += 1;
    }
  }
  if (buf) parts.push(buf);
  return parts;
}

export default function ReactMarkdown({ children }: { children: string }) {
  const lines = (children ?? '').split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Fenced code block
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1];
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      const className = lang ? `language-${lang} hljs` : 'hljs';
      nodes.push(
        <pre key={i}>
          <code className={className}>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }
    // Heading
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      nodes.push(<Tag key={i}>{inline(heading[2])}</Tag>);
      i += 1;
      continue;
    }
    // Bullet list
    if (/^[-*]\s+/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(<li key={i}>{inline(lines[i].replace(/^[-*]\s+/, ''))}</li>);
        i += 1;
      }
      nodes.push(<ul key={`ul-${i}`}>{items}</ul>);
      continue;
    }
    // GFM table
    if (/^\|.+\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s\-:|]+\|\s*$/.test(lines[i + 1])) {
      const header = line.split('|').slice(1, -1).map((s) => s.trim());
      i += 2; // skip header + separator
      const rows: React.ReactNode[] = [];
      while (i < lines.length && /^\|.+\|\s*$/.test(lines[i])) {
        const cells = lines[i].split('|').slice(1, -1).map((s) => s.trim());
        rows.push(
          <tr key={i}>
            {cells.map((c, ci) => (
              <td key={ci}>{c}</td>
            ))}
          </tr>,
        );
        i += 1;
      }
      nodes.push(
        <table key={`t-${i}`}>
          <thead>
            <tr>
              {header.map((h, hi) => (
                <th key={hi}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>,
      );
      continue;
    }
    // Blank / paragraph
    if (line.trim() === '') {
      i += 1;
      continue;
    }
    nodes.push(<p key={i}>{inline(line)}</p>);
    i += 1;
  }
  return <>{nodes}</>;
}
