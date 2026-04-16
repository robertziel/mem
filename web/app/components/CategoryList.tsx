import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Category } from '../types';

type CategoryListProps = {
  categories: Category[];
  onSelect: (name: string) => void;
};

const palette = {
  surface: '#fffaf0',
  surfaceHover: '#faf3e3',
  surfacePressed: '#f6efe2',
  border: '#e4d7b8',
  title: '#102926',
  mutedText: '#7b5b2a',
  chevron: '#c1a977',
};

const systemFont = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
  default: undefined,
}) as string | undefined;

/**
 * Shown when the search bar is empty. Each row is a top-level directory
 * from the seeded notes. Tapping a row calls `onSelect(name)` so the App
 * can drop the name into the search query and filter to notes under it.
 */
export function CategoryList({ categories, onSelect }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No categories</Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.group}>
        {categories.map((category, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === categories.length - 1;
          return (
            <Pressable
              accessibilityLabel={`Open category ${category.name}`}
              accessibilityRole="button"
              testID={`open-category-${category.name}`}
              key={category.name}
              onPress={() => onSelect(category.name)}
              style={({ hovered, pressed }: { hovered?: boolean; pressed?: boolean }) => [
                styles.row,
                isFirst ? styles.rowFirst : null,
                isLast ? styles.rowLast : null,
                hovered ? styles.rowHovered : null,
                pressed ? styles.rowPressed : null,
              ]}
            >
              <Text style={styles.name}>{category.name}</Text>
              <Text style={styles.count}>{category.count}</Text>
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
  name: {
    color: palette.title,
    flex: 1,
    fontFamily: systemFont,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  count: {
    color: palette.mutedText,
    fontFamily: systemFont,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
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
