import { StatusBar } from 'expo-status-bar';
import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { MarkdownRenderer } from './app/components/MarkdownRenderer';
import { NoteList } from './app/components/NoteList';
import { noteRepository } from './app/repository';
import type { NoteListItem, SeedMeta, SeedNote } from './app/types';

type AppState = 'loading' | 'ready' | 'error';
type CompactPane = 'list' | 'detail';

export default function App() {
  const { width } = useWindowDimensions();
  const isCompact = width < 960;
  const [appState, setAppState] = useState<AppState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [meta, setMeta] = useState<SeedMeta | null>(null);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<NoteListItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<SeedNote | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [compactPane, setCompactPane] = useState<CompactPane>('list');
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const nextMeta = await noteRepository.initialize();
        const recentNotes = await noteRepository.listNotes(80);
        if (!active) {
          return;
        }

        setMeta(nextMeta);
        setItems(recentNotes);
        setSelectedPath(recentNotes[0]?.path ?? null);
        setAppState('ready');
      } catch (error) {
        if (!active) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Failed to initialize local notes.');
        setAppState('error');
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (appState !== 'ready') {
      return;
    }

    let active = true;

    async function loadItems() {
      const nextItems = deferredQuery.trim()
        ? await noteRepository.searchNotes(deferredQuery)
        : await noteRepository.listNotes(80);

      if (!active) {
        return;
      }

      setItems(nextItems);
      if (!nextItems.some((item) => item.path === selectedPath)) {
        setSelectedPath(nextItems[0]?.path ?? null);
      }
    }

    void loadItems();

    return () => {
      active = false;
    };
  }, [appState, deferredQuery, selectedPath]);

  useEffect(() => {
    if (!selectedPath || appState !== 'ready') {
      setSelectedNote(null);
      setDetailLoading(false);
      return;
    }

    let active = true;
    const path = selectedPath;
    setDetailLoading(true);

    async function loadNote() {
      const note = await noteRepository.getNote(path);
      if (!active) {
        return;
      }

      setSelectedNote(note);
      setDetailLoading(false);
    }

    void loadNote();

    return () => {
      active = false;
    };
  }, [appState, selectedPath]);

  const showingDetail = !isCompact || compactPane === 'detail';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={Platform.OS === 'web' ? 'dark' : 'auto'} />
      <View style={styles.root}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Local Snapshot Notes</Text>
          <Text style={styles.heading}>mem</Text>
          <Text style={styles.subheading}>
            One React Native app, seeded from markdown, reading only from local storage.
          </Text>
          <View style={styles.metaRow}>
            <MetaPill label="Mode" value="Read-only" />
            <MetaPill label="Cache" value={Platform.OS === 'web' ? 'IndexedDB' : 'SQLite'} />
            <MetaPill label="Notes" value={meta ? String(meta.note_count) : '...'} />
          </View>
        </View>

        <View style={[styles.workspace, isCompact ? styles.workspaceCompact : null]}>
          {(!showingDetail || !isCompact) && (
            <View style={[styles.sidebar, isCompact ? styles.sidebarCompact : null]}>
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarTitle}>Search the local database</Text>
                <TextInput
                  accessibilityLabel="Search notes"
                  onChangeText={(value) => {
                    startTransition(() => setQuery(value));
                    if (isCompact) {
                      setCompactPane('list');
                    }
                  }}
                  placeholder="Try: react useeffect or docker compose"
                  placeholderTextColor="#8f8166"
                  style={styles.searchInput}
                  value={query}
                />
                <Text style={styles.sidebarHint}>
                  {query.trim()
                    ? `Showing ranked matches for “${query.trim()}”`
                    : 'Showing the latest notes from the local snapshot'}
                </Text>
              </View>

              {appState === 'loading' ? (
                <View style={styles.centerState}>
                  <ActivityIndicator color="#a86b18" size="large" />
                  <Text style={styles.stateText}>Loading local note cache…</Text>
                </View>
              ) : null}

              {appState === 'error' ? (
                <View style={styles.centerState}>
                  <Text style={styles.errorTitle}>Couldn&apos;t open the local note cache</Text>
                  <Text style={styles.stateText}>{errorMessage}</Text>
                </View>
              ) : null}

              {appState === 'ready' && items.length === 0 ? (
                <View style={styles.centerState}>
                  <Text style={styles.emptyTitle}>
                    {query.trim() ? 'No matches found' : 'No notes available'}
                  </Text>
                  <Text style={styles.stateText}>
                    {query.trim()
                      ? 'Try a broader query or clear the search to browse the local snapshot.'
                      : 'The seed imported successfully, but there were no notes to display.'}
                  </Text>
                </View>
              ) : null}

              {appState === 'ready' && items.length > 0 ? (
                <NoteList
                  items={items}
                  onSelect={(path) => {
                    setSelectedPath(path);
                    if (isCompact) {
                      setCompactPane('detail');
                    }
                  }}
                  query={query}
                  selectedPath={selectedPath}
                />
              ) : null}
            </View>
          )}

          {showingDetail && (
            <View style={[styles.detailPane, isCompact ? styles.detailPaneCompact : null]}>
              {isCompact ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setCompactPane('list')}
                  style={styles.backButton}
                >
                  <Text style={styles.backButtonText}>Back to results</Text>
                </Pressable>
              ) : null}

              {detailLoading ? (
                <View style={styles.centerState}>
                  <ActivityIndicator color="#a86b18" size="large" />
                  <Text style={styles.stateText}>Opening note…</Text>
                </View>
              ) : null}

              {!detailLoading && selectedNote ? (
                <ScrollView contentContainerStyle={styles.detailScroll}>
                  <View style={styles.detailCard}>
                    <Text style={styles.detailTitle}>{selectedNote.title}</Text>
                    <Text style={styles.detailPath}>{selectedNote.path}</Text>
                    <Text style={styles.detailMeta}>
                      Updated {selectedNote.mtime} • Snapshot run {meta?.server_run_id.slice(0, 8)}
                    </Text>
                    <View style={styles.divider} />
                    <MarkdownRenderer content={selectedNote.content} />
                  </View>
                </ScrollView>
              ) : null}

              {!detailLoading && !selectedNote && appState === 'ready' ? (
                <View style={styles.centerState}>
                  <Text style={styles.emptyTitle}>Pick a note</Text>
                  <Text style={styles.stateText}>
                    Choose a result to preview the locally stored markdown content.
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#efe6d5',
    flex: 1,
  },
  root: {
    backgroundColor: '#efe6d5',
    flex: 1,
  },
  hero: {
    backgroundColor: '#102926',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 10,
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  eyebrow: {
    color: '#f6d38a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heading: {
    color: '#fff7ea',
    fontFamily: Platform.select({ web: 'Georgia, serif', default: undefined }),
    fontSize: 44,
    fontWeight: '700',
  },
  subheading: {
    color: '#d7dfd1',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 760,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  metaPill: {
    backgroundColor: '#163734',
    borderColor: '#2a564f',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  metaLabel: {
    color: '#d7dfd1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: '#fff4df',
    fontSize: 12,
    fontWeight: '700',
  },
  workspace: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
    padding: 20,
  },
  workspaceCompact: {
    flexDirection: 'column',
  },
  sidebar: {
    backgroundColor: '#f6efe2',
    borderRadius: 28,
    flex: 0.9,
    gap: 16,
    padding: 20,
  },
  sidebarCompact: {
    flex: 1,
  },
  sidebarHeader: {
    gap: 10,
  },
  sidebarTitle: {
    color: '#102926',
    fontSize: 24,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#fffaf0',
    borderColor: '#d7cbb6',
    borderRadius: 16,
    borderWidth: 1,
    color: '#18312e',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sidebarHint: {
    color: '#6f684b',
    fontSize: 13,
    lineHeight: 20,
  },
  detailPane: {
    flex: 1.3,
  },
  detailPaneCompact: {
    flex: 1,
  },
  detailScroll: {
    paddingBottom: 28,
  },
  detailCard: {
    backgroundColor: '#fffaf0',
    borderRadius: 28,
    gap: 8,
    minHeight: 320,
    padding: 24,
  },
  detailTitle: {
    color: '#102926',
    fontFamily: Platform.select({ web: 'Georgia, serif', default: undefined }),
    fontSize: 32,
    fontWeight: '700',
  },
  detailPath: {
    color: '#7b5b2a',
    fontSize: 12,
  },
  detailMeta: {
    color: '#6f684b',
    fontSize: 13,
  },
  divider: {
    backgroundColor: '#eadcc2',
    height: 1,
    marginVertical: 8,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    minHeight: 220,
    paddingHorizontal: 24,
  },
  stateText: {
    color: '#6f684b',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#8f2f1b',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#102926',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#102926',
    borderRadius: 999,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#fff4df',
    fontSize: 13,
    fontWeight: '700',
  },
});
