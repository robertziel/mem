import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';

import type { NoteListItem } from '../types';

type NoteListProps = {
  items: NoteListItem[];
  onSelect: (path: string) => void;
  query: string;
  selectedPath: string | null;
  isCompact: boolean;
  /** Extra bottom padding (e.g. keyboard height) added to the scroll container. */
  extraBottomPadding?: number;
};

const palette = {
  surface: '#fffaf0',
  surfaceSelected: '#fff2cc',
  surfaceHover: '#faf3e3',
  border: '#e4d7b8',
  borderStrong: '#d7cbb6',
  accent: '#a86b18',
  title: '#102926',
  mutedText: '#7b5b2a',
  mutedText2: '#8a7b5c',
  chevron: '#c1a977',
  highlightBg: '#fff1b8',
  highlightText: '#5a3d08',
};

const systemFont = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
  default: undefined,
}) as string | undefined;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTerms(query: string): string[] {
  return Array.from(
    new Set(
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0),
    ),
  );
}

function highlight(text: string, terms: string[], keyPrefix: string): ReactNode {
  if (!text || terms.length === 0) return text;
  const pattern = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return parts.map((part, idx) => {
    if (!part) return null;
    const isMatch = terms.includes(part.toLowerCase());
    if (isMatch) {
      return (
        <Text key={`${keyPrefix}-${idx}`} style={styles.highlight}>
          {part}
        </Text>
      );
    }
    return part;
  });
}

export function NoteList({
  items,
  onSelect,
  selectedPath,
  isCompact,
  query,
  extraBottomPadding = 0,
}: NoteListProps) {
  const terms = normalizeTerms(query);
  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        isCompact ? styles.containerCompact : null,
        isCompact && extraBottomPadding > 0 ? { paddingBottom: 120 + extraBottomPadding } : null,
      ]}
    >
      <View style={styles.group}>
        {items.map((item, idx) => {
          const selected = item.path === selectedPath;
          const isFirst = idx === 0;
          const isLast = idx === items.length - 1;
          const preview = item.preview?.trim();
          return (
            <Pressable
              accessibilityLabel={`Open ${item.title}`}
              accessibilityRole="button"
              testID={`open-note-${idx}`}
              key={item.path}
              onPress={() => onSelect(item.path)}
              style={({ hovered, pressed }: { hovered?: boolean; pressed?: boolean }) => [
                styles.row,
                isFirst ? styles.rowFirst : null,
                isLast ? styles.rowLast : null,
                selected ? styles.rowSelected : null,
                hovered ? styles.rowHovered : null,
                pressed ? styles.rowPressed : null,
              ]}
            >
              <View style={styles.rowContent}>
                <Text numberOfLines={1} style={styles.title}>
                  {highlight(item.title, terms, `t-${idx}`)}
                </Text>
                <Text numberOfLines={1} style={styles.path}>
                  {highlight(item.path, terms, `p-${idx}`)}
                </Text>
                {terms.length > 0 && preview ? (
                  <Text numberOfLines={3} style={styles.preview}>
                    {highlight(preview, terms, `pv-${idx}`)}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  containerCompact: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 120,
  },
  group: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  rowHovered: {
    backgroundColor: palette.surfaceHover,
  },
  rowPressed: {
    backgroundColor: palette.surfaceHover,
  },
  rowSelected: {
    backgroundColor: palette.surfaceSelected,
  },
  rowContent: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: palette.title,
    fontFamily: systemFont,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  path: {
    color: palette.mutedText,
    fontFamily: systemFont,
    fontSize: 12,
  },
  preview: {
    color: palette.mutedText2,
    fontFamily: systemFont,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  chevron: {
    color: palette.chevron,
    fontFamily: systemFont,
    fontSize: 20,
    fontWeight: '500',
  },
  highlight: {
    backgroundColor: palette.highlightBg,
    color: palette.highlightText,
    fontWeight: '700',
  },
});
