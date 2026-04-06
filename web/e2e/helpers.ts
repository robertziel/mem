const API_BASE = process.env.API_URL || 'http://localhost:8000';

let counter = 0;

export function uniqueTitle(prefix: string): string {
  counter++;
  return `${prefix} ${Date.now()}_${counter}`;
}

export async function createTestNote(
  title: string,
  tags = '',
  body = '',
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, tags, body }),
  });
  if (!res.ok) throw new Error(`Failed to create test note: ${res.status}`);
  const data = await res.json();
  return data.path as string;
}

export async function deleteTestNote(path: string): Promise<void> {
  await fetch(`${API_BASE}/api/notes/${path}`, { method: 'DELETE' });
}

export async function getTestNote(path: string): Promise<{ content: string; title: string }> {
  const res = await fetch(`${API_BASE}/api/notes/${path}`);
  if (!res.ok) throw new Error(`Failed to get note: ${res.status}`);
  return res.json();
}
