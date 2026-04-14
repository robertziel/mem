import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { NoteListItem } from '../types';

type NoteListProps = {
  items: NoteListItem[];
  onSelect: (path: string) => void;
  query: string;
  selectedPath: string | null;
};

export function NoteList({ items, onSelect, query, selectedPath }: NoteListProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {items.map((item) => {
        const selected = item.path === selectedPath;
        return (
          <Pressable
            accessibilityLabel={`Open ${item.title}`}
            accessibilityRole="button"
            key={item.path}
            onPress={() => onSelect(item.path)}
            style={[styles.card, selected ? styles.cardSelected : null]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.date}>{item.mtime}</Text>
            </View>
            <Text style={styles.path}>{item.path}</Text>
            {query.trim() && item.preview ? (
              <Text numberOfLines={4} style={styles.preview}>
                {item.preview}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fffaf0',
    borderColor: '#d7cbb6',
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  cardSelected: {
    backgroundColor: '#fff2cc',
    borderColor: '#b07b32',
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  title: {
    color: '#102926',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  date: {
    color: '#7f6d4d',
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  path: {
    color: '#7b5b2a',
    fontSize: 12,
  },
  preview: {
    color: '#304744',
    fontSize: 13,
    lineHeight: 20,
  },
});
