import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { NoteListItem } from '../types';

type NoteListProps = {
  items: NoteListItem[];
  onSelect: (path: string) => void;
  query: string;
  selectedPath: string | null;
  isCompact: boolean;
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
};

const systemFont = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
  default: undefined,
}) as string | undefined;

export function NoteList({ items, onSelect, selectedPath, isCompact }: NoteListProps) {
  return (
    <ScrollView contentContainerStyle={[styles.container, isCompact ? styles.containerCompact : null]}>
      <View style={styles.group}>
        {items.map((item, idx) => {
          const selected = item.path === selectedPath;
          const isFirst = idx === 0;
          const isLast = idx === items.length - 1;
          return (
            <Pressable
              accessibilityLabel={`Open ${item.title}`}
              accessibilityRole="button"
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
                  {item.title}
                </Text>
                <Text numberOfLines={1} style={styles.path}>
                  {item.path}
                </Text>
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
    gap: 2,
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
  chevron: {
    color: palette.chevron,
    fontFamily: systemFont,
    fontSize: 20,
    fontWeight: '500',
  },
});
