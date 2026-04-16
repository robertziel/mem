import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DirectoryView } from '../types';

type DirectoryBrowserProps = {
  view: DirectoryView;
  onSubdirSelect: (name: string) => void;
  onNoteSelect: (path: string) => void;
  extraBottomPadding?: number;
};

const palette = {
  surface: '#fffaf0',
  surfaceHover: '#faf3e3',
  surfacePressed: '#f6efe2',
  border: '#e4d7b8',
  title: '#102926',
  mutedText: '#7b5b2a',
  mutedText2: '#8a7b5c',
  chevron: '#c1a977',
};

const systemFont = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
  default: undefined,
}) as string | undefined;

/**
 * Shown when the search query exactly matches an existing directory
 * path. Renders a breadcrumb with the current path, then child subdirs
 * (as "category" rows) followed by the files that live directly in
 * this directory (as note rows). Both groups are nothing more than
 * thin wrappers around the standard row styling so the two aria-label
 * families ("Open category <name>" / "Open <title>") stay consistent
 * with the rest of the app.
 */
export function DirectoryBrowser({
  view,
  onSubdirSelect,
  onNoteSelect,
  extraBottomPadding = 0,
}: DirectoryBrowserProps) {
  const hasSubdirs = view.subdirs.length > 0;
  const hasNotes = view.notes.length > 0;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        extraBottomPadding > 0 ? { paddingBottom: 120 + extraBottomPadding } : null,
      ]}
    >
      <Text style={styles.breadcrumb}>{view.path}</Text>

      {hasSubdirs ? (
        <>
          <Text style={styles.sectionHeader}>Folders</Text>
          <View style={styles.group}>
            {view.subdirs.map((subdir, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === view.subdirs.length - 1;
              return (
                <Pressable
                  accessibilityLabel={`Open category ${subdir.name}`}
                  accessibilityRole="button"
                  testID={`open-subdir-${subdir.name}`}
                  key={subdir.name}
                  onPress={() => onSubdirSelect(subdir.name)}
                  style={({ hovered, pressed }: { hovered?: boolean; pressed?: boolean }) => [
                    styles.row,
                    isFirst ? styles.rowFirst : null,
                    isLast ? styles.rowLast : null,
                    hovered ? styles.rowHovered : null,
                    pressed ? styles.rowPressed : null,
                  ]}
                >
                  <Text style={styles.rowTitle}>{subdir.name}</Text>
                  <Text style={styles.rowCount}>{subdir.count}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {hasNotes ? (
        <>
          <Text style={styles.sectionHeader}>Notes</Text>
          <View style={styles.group}>
            {view.notes.map((note, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === view.notes.length - 1;
              return (
                <Pressable
                  accessibilityLabel={`Open ${note.title}`}
                  accessibilityRole="button"
                  testID={`open-note-${idx}`}
                  key={note.path}
                  onPress={() => onNoteSelect(note.path)}
                  style={({ hovered, pressed }: { hovered?: boolean; pressed?: boolean }) => [
                    styles.row,
                    isFirst ? styles.rowFirst : null,
                    isLast ? styles.rowLast : null,
                    hovered ? styles.rowHovered : null,
                    pressed ? styles.rowPressed : null,
                  ]}
                >
                  <View style={styles.noteContent}>
                    <Text numberOfLines={1} style={styles.rowTitle}>
                      {note.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.rowPath}>
                      {note.path}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {!hasSubdirs && !hasNotes ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>This directory is empty</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  breadcrumb: {
    color: palette.mutedText,
    fontFamily: systemFont,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    color: palette.mutedText2,
    fontFamily: systemFont,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 8,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  group: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowFirst: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  rowLast: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomWidth: 0,
  },
  rowHovered: { backgroundColor: palette.surfaceHover },
  rowPressed: { backgroundColor: palette.surfacePressed },
  rowTitle: {
    color: palette.title,
    flex: 1,
    fontFamily: systemFont,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rowCount: {
    color: palette.mutedText,
    fontFamily: systemFont,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  rowPath: {
    color: palette.mutedText,
    fontFamily: systemFont,
    fontSize: 12,
  },
  noteContent: {
    flex: 1,
    gap: 2,
  },
  chevron: {
    color: palette.chevron,
    fontFamily: systemFont,
    fontSize: 20,
    fontWeight: '500',
  },
  emptyWrap: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: palette.mutedText,
    fontFamily: systemFont,
    fontSize: 14,
  },
});
