import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { NoteListItem } from '../types';

type NoteListProps = {
  items: NoteListItem[];
  onSelect: (path: string) => void;
  query: string;
  selectedPath: string | null;
};

export function NoteList({ items, onSelect, selectedPath }: NoteListProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {items.map((item, idx) => {
        const selected = item.path === selectedPath;
        return (
          <Pressable
            accessibilityLabel={`Open ${item.title}`}
            accessibilityRole="button"
            key={item.path}
            onPress={() => onSelect(item.path)}
            style={({ hovered }: { hovered?: boolean }) => [
              styles.row,
              idx > 0 ? styles.rowBorder : null,
              selected ? styles.rowSelected : null,
              hovered ? styles.rowHovered : null,
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 120,
  },
  row: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowBorder: {
    borderTopColor: '#e5e5ea',
    borderTopWidth: 1,
  },
  rowSelected: {
    backgroundColor: '#f2f2f7',
  },
  rowHovered: {
    backgroundColor: '#f9f9fb',
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  path: {
    color: '#8e8e93',
    fontSize: 12,
  },
  chevron: {
    color: '#c7c7cc',
    fontSize: 20,
    fontWeight: '400',
  },
});
