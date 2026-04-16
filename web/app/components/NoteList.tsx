import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { NoteListItem } from '../types';

type NoteListProps = {
  items: NoteListItem[];
  onSelect: (path: string) => void;
  query: string;
  selectedPath: string | null;
  isCompact: boolean;
};

const iOS = {
  systemBackground: '#ffffff',
  systemGroupedBackground: '#f2f2f7',
  label: '#000000',
  secondaryLabel: '#3c3c4399',
  separator: '#3c3c432d',
  systemGray3: '#c7c7cc',
  systemGray5: '#e5e5ea',
  systemBlue: '#007aff',
};

const iosSystemFont = Platform.select({
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
    paddingTop: 8,
    paddingBottom: 24,
  },
  containerCompact: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  group: {
    backgroundColor: iOS.systemBackground,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    backgroundColor: iOS.systemBackground,
    borderBottomColor: iOS.separator,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowFirst: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  rowLast: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderBottomWidth: 0,
  },
  rowHovered: {
    backgroundColor: '#fafafc',
  },
  rowPressed: {
    backgroundColor: iOS.systemGray5,
  },
  rowSelected: {
    backgroundColor: '#eef5ff',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: iOS.label,
    fontFamily: iosSystemFont,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  path: {
    color: iOS.secondaryLabel,
    fontFamily: iosSystemFont,
    fontSize: 12,
  },
  chevron: {
    color: iOS.systemGray3,
    fontFamily: iosSystemFont,
    fontSize: 20,
    fontWeight: '500',
  },
});
