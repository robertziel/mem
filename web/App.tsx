import { StatusBar } from 'expo-status-bar';
import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
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

// Warm Claude earth-tone palette
const palette = {
  bg: '#efe6d5',               // page background (warm parchment)
  surface: '#fffaf0',          // card surface
  surfaceAlt: '#f6efe2',       // alt surface (grouping stripe)
  surfaceInput: '#fffaf0',     // input background
  surfaceSelected: '#fff2cc',  // selected row tint
  border: '#e4d7b8',           // soft border
  borderStrong: '#d7cbb6',     // stronger border
  title: '#102926',            // dark teal title
  text: '#18312e',             // body text
  mutedText: '#7b5b2a',        // brown secondary
  mutedText2: '#8a7b5c',       // muted label
  accent: '#a86b18',           // brown accent
  accentDark: '#7b5b2a',       // deeper brown
  danger: '#8f2f1b',           // rust red
};

export default function App() {
  const { width } = useWindowDimensions();
  const isCompact = width < 960;
  const searchInputRef = useRef<TextInput | null>(null);
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

  const goBackToList = () => setCompactPane('list');

  const cleanSearch = () => {
    setQuery('');
    setCompactPane('list');
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const handleSelect = (path: string) => {
    setSelectedPath(path);
    if (isCompact) setCompactPane('detail');
  };

  const handleQueryChange = (value: string) => {
    startTransition(() => setQuery(value));
    if (isCompact && compactPane === 'detail') {
      setCompactPane('list');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={Platform.OS === 'web' ? 'dark' : 'auto'} />
      <View style={[styles.root, isCompact ? styles.rootCompact : null]}>
        {!isCompact && (
          <View style={styles.desktopLayout}>
            <View style={styles.sidebar}>
              <View style={styles.desktopSearchBar}>
                <SearchField query={query} onChangeText={handleQueryChange} />
              </View>
              {renderListPane({ appState, errorMessage, items, query, selectedPath, onSelect: handleSelect, isCompact })}
            </View>
            <View style={styles.detailPane}>
              {renderDetailPane({ appState, detailLoading, note: selectedNote, isCompact })}
            </View>
          </View>
        )}

        {isCompact && showingList && (
          <View style={styles.compactPane}>
            {renderListPane({ appState, errorMessage, items, query, selectedPath, onSelect: handleSelect, isCompact })}
          </View>
        )}
        {isCompact && showingDetail && (
          <View style={styles.compactPane}>
            {renderDetailPane({ appState, detailLoading, note: selectedNote, isCompact })}
          </View>
        )}

        {isCompact && (
          <View style={styles.bottomBar}>
            <View style={styles.bottomSearchWrap}>
              <SearchField query={query} onChangeText={handleQueryChange} inputRef={searchInputRef} />
            </View>
            <Pressable
              accessibilityLabel="Clear search and focus"
              accessibilityRole="button"
              testID="clean-button"
              onPress={cleanSearch}
              style={({ pressed }: { pressed?: boolean }) => [
                styles.textButton,
                pressed ? styles.toolbarButtonPressed : null,
              ]}
            >
              <Text style={styles.textButtonLabel}>Clean</Text>
            </Pressable>
            {compactPane === 'detail' && (
              <Pressable
                accessibilityLabel="Back to list"
                accessibilityRole="button"
                testID="back-button"
                onPress={goBackToList}
                style={({ pressed }: { pressed?: boolean }) => [
                  styles.iconButton,
                  pressed ? styles.toolbarButtonPressed : null,
                ]}
              >
                <Text style={styles.backChevron}>‹</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

type SearchFieldProps = {
  query: string;
  onChangeText: (value: string) => void;
  inputRef?: React.Ref<TextInput>;
};

function SearchField({ query, onChangeText, inputRef }: SearchFieldProps) {
  return (
    <View style={styles.searchPill}>
      <Text style={styles.searchGlyph}>⌕</Text>
      <TextInput
        ref={inputRef}
        accessibilityLabel="Search notes"
        testID="search-input"
        onChangeText={onChangeText}
        placeholder="Search"
        placeholderTextColor={palette.mutedText2}
        style={styles.searchInput}
        value={query}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {query.length > 0 ? (
        <Pressable accessibilityLabel="Clear search" onPress={() => onChangeText('')} style={styles.clearButton}>
          <Text style={styles.clearGlyph}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function renderListPane(args: {
  appState: AppState;
  errorMessage: string;
  items: NoteListItem[];
  query: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  isCompact: boolean;
}) {
  const { appState, errorMessage, items, query, selectedPath, onSelect, isCompact } = args;
  if (appState === 'loading') {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={palette.accent} size="small" />
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
        <Text style={styles.emptyText}>{query.trim() ? 'No matches' : 'No notes'}</Text>
      </View>
    );
  }
  return (
    <NoteList
      items={items}
      onSelect={onSelect}
      query={query}
      selectedPath={selectedPath}
      isCompact={isCompact}
    />
  );
}

function renderDetailPane(args: {
  appState: AppState;
  detailLoading: boolean;
  note: SeedNote | null;
  isCompact: boolean;
}) {
  const { appState, detailLoading, note, isCompact } = args;
  if (detailLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={palette.accent} size="small" />
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
    <ScrollView contentContainerStyle={[styles.detailScroll, isCompact ? styles.detailScrollCompact : null]}>
      <Text style={styles.detailTitle}>{note.title}</Text>
      <Text style={styles.detailMeta}>Updated {note.mtime}</Text>
      <View style={styles.detailBody}>
        <MarkdownRenderer content={note.content} />
      </View>
    </ScrollView>
  );
}

const systemFont = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
  default: undefined,
}) as string | undefined;

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: palette.bg,
    flex: 1,
  },
  root: {
    backgroundColor: palette.bg,
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
    backgroundColor: palette.bg,
    borderRightColor: palette.border,
    borderRightWidth: 1,
    minWidth: 320,
    width: 360,
  },
  desktopSearchBar: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },
  detailPane: {
    backgroundColor: palette.surface,
    flex: 1,
  },
  compactPane: {
    flex: 1,
  },

  // Search pill
  searchPill: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchGlyph: {
    color: palette.mutedText2,
    fontSize: 16,
  },
  searchInput: {
    color: palette.title,
    flex: 1,
    fontFamily: systemFont,
    fontSize: 16,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as unknown as 'solid' } : {}),
  },
  clearButton: {
    alignItems: 'center',
    backgroundColor: palette.mutedText2,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  clearGlyph: {
    color: palette.surface,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },

  // Bottom bar
  bottomBar: {
    alignItems: 'center',
    backgroundColor: 'rgba(239, 230, 213, 0.92)',
    borderTopColor: palette.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: 8,
    left: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    position: 'absolute',
    right: 0,
    ...(Platform.OS === 'web' ? {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      backdropFilter: 'saturate(180%) blur(20px)' as any,
      paddingBottom: 'max(12px, env(safe-area-inset-bottom))' as unknown as number,
    } : {}),
  },
  bottomSearchWrap: {
    flex: 1,
  },

  // Toolbar buttons
  toolbarButton: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: 12,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  textButton: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderColor: palette.borderStrong,
    borderRadius: 12,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  textButtonLabel: {
    color: palette.accent,
    fontFamily: systemFont,
    fontSize: 14,
    fontWeight: '600',
  },
  toolbarButtonPressed: {
    opacity: 0.5,
  },
  backChevron: {
    color: palette.accent,
    fontFamily: systemFont,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: -2,
  },
  toolbarButtonText: {
    color: palette.accent,
    fontFamily: systemFont,
    fontSize: 15,
    fontWeight: '600',
  },

  // States
  centerState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: palette.mutedText2,
    fontFamily: systemFont,
    fontSize: 15,
  },
  errorText: {
    color: palette.danger,
    fontFamily: systemFont,
    fontSize: 15,
    textAlign: 'center',
  },

  // Detail
  detailScroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  detailScrollCompact: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  detailTitle: {
    color: palette.title,
    fontFamily: Platform.select({ web: 'Georgia, "Iowan Old Style", serif', default: undefined }),
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  detailMeta: {
    color: palette.mutedText,
    fontFamily: systemFont,
    fontSize: 13,
    marginBottom: 18,
  },
  detailBody: {
    marginTop: 4,
  },
});
