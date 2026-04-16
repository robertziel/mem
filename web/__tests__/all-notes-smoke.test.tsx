import { render } from '@testing-library/react';
import { MarkdownRenderer } from '../app/components/MarkdownRenderer';
import seed from '../assets/generated/seed.json';
import type { SeedNote } from '../app/types';

type SeedPayload = { notes: SeedNote[] };

const payload = seed as SeedPayload;

describe(`All notes smoke — ${payload.notes.length} notes`, () => {
  // One it() per note so a failure tells you exactly which note broke.
  // Runtime ≈ 10-30s for ~800 notes because the markdown shim is tiny.
  it.each(payload.notes.map((n) => [n.path, n] as const))(
    'renders %s without throwing',
    (_path, note) => {
      expect(() => render(<MarkdownRenderer content={note.content} />)).not.toThrow();
    },
  );

  it('every seeded note has a non-empty title and content', () => {
    for (const note of payload.notes) {
      expect(note.title).toBeTruthy();
      expect(note.content.length).toBeGreaterThan(0);
    }
  });
});
