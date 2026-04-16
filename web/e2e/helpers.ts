import { expect, type Page } from '@playwright/test';

export const fixtures = {
  dockerCompose: {
    title: 'Docker Compose',
    path: 'devops/docker/docker_compose.md',
    query: 'docker compose',
    preview: 'Basic docker-compose.yml',
  },
  jwt: {
    title: 'JWT',
    path: 'frontend/network_security_auth/jwt_json_web_token_bearer_stateless_auth.md',
    query: 'frontend jwt auth',
    preview: 'Authorization: Bearer',
  },
  useEffect: {
    title: 'useEffect',
    path: 'frontend/react/useeffect_react_side_effect_cleanup_dependencies.md',
    query: 'frontend react useeffect',
    preview: 'Runs side effects after render',
  },
} as const;

type IndexedDbSnapshot = {
  meta: {
    generated_at: string;
    note_count: number;
    seed_version: number;
    server_run_id: string;
    source_dir: string;
  } | null;
  noteCount: number;
};

const DB_NAME = 'mem-local-notes';
const DB_VERSION = 1;
const NOTE_STORE = 'notes';
const META_STORE = 'meta';

export async function gotoApp(page: Page): Promise<void> {
  await page.goto('/');
  // Search pill placeholder is "Search"; at least one note button is present
  await expect(page.getByPlaceholder('Search')).toBeVisible();
  await expect(page.getByRole('button').first()).toBeVisible();
}

export async function searchFor(page: Page, query: string): Promise<void> {
  await gotoApp(page);
  await page.getByPlaceholder('Search').fill(query);
}

export async function openFixture(
  page: Page,
  fixture: (typeof fixtures)[keyof typeof fixtures],
): Promise<void> {
  await searchFor(page, fixture.query);
  const button = page
    .getByRole('button')
    .filter({ has: page.getByText(fixture.path, { exact: true }) })
    .first();
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.getByText(fixture.path, { exact: true }).last()).toBeVisible();
}

export async function readIndexedDbSnapshot(page: Page): Promise<IndexedDbSnapshot> {
  return page.evaluate(async ({ dbName, dbVersion, noteStore, metaStore }) => {
    const openDb = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);
      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
      request.onsuccess = () => resolve(request.result);
    });

    const noteCount = await new Promise<number>((resolve, reject) => {
      const tx = openDb.transaction(noteStore, 'readonly');
      const request = tx.objectStore(noteStore).count();
      request.onerror = () => reject(request.error ?? new Error('Failed to count notes'));
      request.onsuccess = () => resolve(request.result);
    });

    const meta = await new Promise<IndexedDbSnapshot['meta']>((resolve, reject) => {
      const tx = openDb.transaction(metaStore, 'readonly');
      const request = tx.objectStore(metaStore).get('seed_meta');
      request.onerror = () => reject(request.error ?? new Error('Failed to read seed metadata'));
      request.onsuccess = () => resolve((request.result as IndexedDbSnapshot['meta']) ?? null);
    });

    openDb.close();
    return { noteCount, meta };
  }, {
    dbName: DB_NAME,
    dbVersion: DB_VERSION,
    noteStore: NOTE_STORE,
    metaStore: META_STORE,
  });
}

export async function mutateIndexedDbNoteTitle(
  page: Page,
  path: string,
  title: string,
): Promise<void> {
  await page.evaluate(
    async ({ dbName, dbVersion, noteStore, pathToUpdate, nextTitle }) => {
      const openDb = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
        request.onsuccess = () => resolve(request.result);
      });

      const note = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const tx = openDb.transaction(noteStore, 'readonly');
        const request = tx.objectStore(noteStore).get(pathToUpdate);
        request.onerror = () => reject(request.error ?? new Error('Failed to read note'));
        request.onsuccess = () => resolve(request.result as Record<string, unknown>);
      });

      if (!note) {
        openDb.close();
        throw new Error(`Note not found in IndexedDB: ${pathToUpdate}`);
      }

      note.title = nextTitle;
      await new Promise<void>((resolve, reject) => {
        const tx = openDb.transaction(noteStore, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Failed to update note'));
        tx.objectStore(noteStore).put(note);
      });

      openDb.close();
    },
    {
      dbName: DB_NAME,
      dbVersion: DB_VERSION,
      noteStore: NOTE_STORE,
      pathToUpdate: path,
      nextTitle: title,
    },
  );
}

export async function overwriteIndexedDbServerRunId(page: Page, serverRunId: string): Promise<void> {
  await page.evaluate(
    async ({ dbName, dbVersion, metaStore, nextServerRunId }) => {
      const openDb = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
        request.onsuccess = () => resolve(request.result);
      });

      const seedMeta = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const tx = openDb.transaction(metaStore, 'readonly');
        const request = tx.objectStore(metaStore).get('seed_meta');
        request.onerror = () => reject(request.error ?? new Error('Failed to read seed metadata'));
        request.onsuccess = () => resolve(request.result as Record<string, unknown>);
      });

      if (!seedMeta) {
        openDb.close();
        throw new Error('seed_meta not found in IndexedDB');
      }

      seedMeta.server_run_id = nextServerRunId;
      await new Promise<void>((resolve, reject) => {
        const tx = openDb.transaction(metaStore, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Failed to update seed metadata'));
        tx.objectStore(metaStore).put(seedMeta, 'seed_meta');
      });

      openDb.close();
    },
    {
      dbName: DB_NAME,
      dbVersion: DB_VERSION,
      metaStore: META_STORE,
      nextServerRunId: serverRunId,
    },
  );
}

export async function readRemoteSeedMeta(page: Page): Promise<IndexedDbSnapshot['meta']> {
  return page.evaluate(async () => {
    const response = await fetch('/seed.meta.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load remote seed meta (${response.status})`);
    }
    return (await response.json()) as IndexedDbSnapshot['meta'];
  });
}
