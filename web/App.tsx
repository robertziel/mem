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
import type { NoteListItem, SeedNote } from './app/types';

type AppState = 'loading' | 'ready' | 'error';
type CompactPane = 'list' | 'detail';

export default function App() {
  const { width } = useWindowDimensions();
  const isCompact = width < 960;
  const [appState, setAppState] = useState<AppState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
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
        await noteRepository.initialize();
        const recent = await noteRepository.listNotes(80);
        if (!active) return;
        setItems(recent);
        setSelectedPath(recent[0]?.path ?? null);
        setAppState('ready');
      } catch (error) {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load notes.');
        setAppState('error');
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (appState !== 'ready') return;
    let active = true;
    async function loadItems() {
      const next = deferredQuery.trim()
        ? await noteRepository.searchNotes(deferredQuery)
        : await noteRepository.listNotes(80);
      if (!active) return;
      setItems(next);
      if (!next.some((item) => item.path === selectedPath)) {
        setSelectedPath(next[0]?.path ?? null);
      }
    }
    void loadItems();
    return () => { active = false; };
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
      if (!active) return;
      setSelectedNote(note);
      setDetailLoading(false);
    }
    void loadNote();
    return () => { active = false; };
  }, [appState, selectedPath]);

  const showingDetail = !isCompact || compactPane === 'detail';
  const showingList = !isCompact || compactPane === 'list';

  const goBackToList = () => {
    setCompactPane('list');
  };

  const handleSelect = (path: string) => {
    setSelectedPath(path);
    if (isCompact) setCompactPane('detail');
  };

  const handleQueryChange = (value: string) => {
    startTransition(() => setQuery(value));
    // If we were reading a note, typing in search returns to list
    if (isCompact && compactPane === 'detail') {
      setCompactPane('list');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={Platform.OS === 'web' ? 'dark' : 'auto'} />
      <View style={[styles.root, isCompact ? styles.rootCompact : null]}>
        {/* Desktop layout: side-by-side */}
        {!isCompact && (
          <View style={styles.desktopLayout}>
            <View style={styles.sidebar}>
              <View style={styles.desktopSearchBar}>
                <TextInput
                  accessibilityLabel="Search notes"
                  onChangeText={handleQueryChange}
                  placeholder="Search"
                  placeholderTextColor="#8e8e93"
                  style={styles.searchInput}
                  value={query}
                />
              </View>
              {renderListPane({ appState, errorMessage, items, query, selectedPath, onSelect: handleSelect })}
            </View>
            <View style={styles.detailPane}>
              {renderDetailPane({ appState, detailLoading, note: selectedNote })}
            </View>
          </View>
        )}

        {/* Compact (mobile) layout: single pane + fixed bottom bar */}
        {isCompact && showingList && (
          <View style={styles.compactPane}>
            {renderListPane({ appState, errorMessage, items, query, selectedPath, onSelect: handleSelect })}
          </View>
        )}
        {isCompact && showingDetail && (
          <View style={styles.compactPane}>
            {renderDetailPane({ appState, detailLoading, note: selectedNote })}
          </View>
        )}

        {isCompact && (
          <View style={styles.bottomBar}>
            <TextInput
              accessibilityLabel="Search notes"
              onChangeText={handleQueryChange}
              placeholder="Search"
              placeholderTextColor="#8e8e93"
              style={styles.bottomSearchInput}
              value={query}
            />
            {compactPane === 'detail' && (
              <Pressable
                accessibilityLabel="Back to list"
                accessibilityRole="button"
                onPress={goBackToList}
                style={({ pressed }: { pressed?: boolean }) => [
                  styles.backButton,
                  pressed ? styles.backButtonPressed : null,
                ]}
              >
                <Text style={styles.backButtonText}>‹ Back</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function renderListPane(args: {
  appState: AppState;
  errorMessage: string;
  items: NoteListItem[];
  query: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const { appState, errorMessage, items, query, selectedPath, onSelect } = args;
  if (appState === 'loading') {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#8e8e93" size="small" />
      </View>
    );
  }
  if (appState === 'error') {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorText}>{errorMessage || 'Failed to load notes.'}</Text>
      </View>
    );
  }
  if (items.length === 0) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyText}>
          {query.trim() ? 'No matches' : 'No notes'}
        </Text>
      </View>
    );
  }
  return (
    <NoteList
      items={items}
      onSelect={onSelect}
      query={query}
      selectedPath={selectedPath}
    />
  );
}

function renderDetailPane(args: {
  appState: AppState;
  detailLoading: boolean;
  note: SeedNote | null;
}) {
  const { appState, detailLoading, note } = args;
  if (detailLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color="#8e8e93" size="small" />
      </View>
    );
  }
  if (!note && appState === 'ready') {
    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyText}>Select a note</Text>
      </View>
    );
  }
  if (!note) return null;
  return (
    <ScrollView contentContainerStyle={styles.detailScroll}>
      <Text style={styles.detailTitle}>{note.title}</Text>
      <Text style={styles.detailPath}>{note.path}</Text>
      <Text style={styles.detailDate}>Updated {note.mtime}</Text>
      <View style={styles.detailBody}>
        <MarkdownRenderer content={note.content} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  root: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  rootCompact: {
    position: 'relative',
  },
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: '#ffffff',
    borderRightColor: '#e5e5ea',
    borderRightWidth: 1,
    minWidth: 320,
    width: 360,
  },
  desktopSearchBar: {
    borderBottomColor: '#e5e5ea',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailPane: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  compactPane: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: '#f2f2f7',
    borderRadius: 10,
    color: '#000000',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bottomBar: {
    backgroundColor: '#f9f9fb',
    borderTopColor: '#e5e5ea',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 8,
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'absolute',
    right: 0,
    ...(Platform.OS === 'web' ? { paddingBottom: 'max(10px, env(safe-area-inset-bottom))' as unknown as number } : {}),
  },
  bottomSearchInput: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e5ea',
    borderRadius: 10,
    borderWidth: 1,
    color: '#000000',
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5e5ea',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonPressed: {
    backgroundColor: '#f2f2f7',
  },
  backButtonText: {
    color: '#007aff',
    fontSize: 15,
    fontWeight: '500',
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: '#8e8e93',
    fontSize: 15,
  },
  errorText: {
    color: '#d0021b',
    fontSize: 15,
    textAlign: 'center',
  },
  detailScroll: {
    padding: 20,
    paddingBottom: 120,
  },
  detailTitle: {
    color: '#000000',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  detailPath: {
    color: '#8e8e93',
    fontSize: 12,
    marginBottom: 2,
  },
  detailDate: {
    color: '#8e8e93',
    fontSize: 12,
    marginBottom: 16,
  },
  detailBody: {
    marginTop: 4,
  },
});
