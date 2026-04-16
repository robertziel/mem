import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Category } from '../types';

type FilterChipsProps = {
  /** Currently-selected filter path, shown as breadcrumb segments on the left. */
  breadcrumb: string[];
  /** Distinct next-depth options the user can tap to narrow the list. */
  options: Category[];
  onPickOption: (name: string) => void;
  onPopBreadcrumb: (depth: number) => void;
  onClearAll: () => void;
};

const palette = {
  barBg: '#efe6d5',
  chipBg: '#fffaf0',
  chipBgSelected: '#fff2cc',
  chipBgHover: '#faf3e3',
  chipBorder: '#e4d7b8',
  chipBorderSelected: '#d8bf7e',
  label: '#102926',
  mutedText: '#7b5b2a',
  count: '#8a7b5c',
  chevron: '#c1a977',
};

const systemFont = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
  default: undefined,
}) as string | undefined;

/**
 * Horizontal, scrollable filter bar shown above flat-search results. The
 * bar carries three kinds of chips:
 *   1. "All" — clears any active filter; always present when there is
 *      anything filtered OR any option to choose from.
 *   2. Breadcrumb chips — the already-selected filter path, tappable to
 *      pop back to that depth.
 *   3. Option chips — the distinct next-depth directory segments the
 *      user can tap to narrow the list.
 */
export function FilterChips({
  breadcrumb,
  options,
  onPickOption,
  onPopBreadcrumb,
  onClearAll,
}: FilterChipsProps) {
  if (breadcrumb.length === 0 && options.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Chip
          accessibilityLabel="Clear filter"
          label="All"
          kind="muted"
          onPress={onClearAll}
          testID="filter-clear"
        />

        {breadcrumb.map((segment, idx) => (
          <View key={`crumb-${idx}-${segment}`} style={styles.breadcrumbPair}>
            <Text style={styles.separator}>›</Text>
            <Chip
              accessibilityLabel={`Pop filter to ${segment}`}
              label={segment}
              kind="selected"
              onPress={() => onPopBreadcrumb(idx + 1)}
              testID={`filter-pop-${segment}`}
            />
          </View>
        ))}

        {options.length > 0 ? <Text style={styles.separator}>›</Text> : null}

        {options.map((option) => (
          <Chip
            key={`opt-${option.name}`}
            accessibilityLabel={`Filter by ${option.name}`}
            label={option.name}
            count={option.count}
            kind="default"
            onPress={() => onPickOption(option.name)}
            testID={`filter-option-${option.name}`}
          />
        ))}
      </ScrollView>
    </View>
  );
}

type ChipProps = {
  accessibilityLabel: string;
  label: string;
  count?: number;
  kind: 'default' | 'muted' | 'selected';
  onPress: () => void;
  testID?: string;
};

function Chip({ accessibilityLabel, label, count, kind, onPress, testID }: ChipProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      testID={testID}
      style={({ hovered, pressed }: { hovered?: boolean; pressed?: boolean }) => [
        styles.chip,
        kind === 'selected' ? styles.chipSelected : null,
        hovered ? styles.chipHover : null,
        pressed ? styles.chipHover : null,
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          kind === 'muted' ? styles.chipLabelMuted : null,
          kind === 'selected' ? styles.chipLabelSelected : null,
        ]}
      >
        {label}
      </Text>
      {typeof count === 'number' ? <Text style={styles.chipCount}>{count}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: palette.barBg,
  },
  row: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: palette.chipBg,
    borderColor: palette.chipBorder,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: palette.chipBgSelected,
    borderColor: palette.chipBorderSelected,
  },
  chipHover: {
    backgroundColor: palette.chipBgHover,
  },
  chipLabel: {
    color: palette.label,
    fontFamily: systemFont,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  chipLabelMuted: {
    color: palette.mutedText,
    fontWeight: '500',
  },
  chipLabelSelected: {
    color: palette.label,
  },
  chipCount: {
    color: palette.count,
    fontFamily: systemFont,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  separator: {
    color: palette.chevron,
    fontFamily: systemFont,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  breadcrumbPair: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
});
