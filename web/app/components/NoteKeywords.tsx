import { Platform, StyleSheet, Text, View } from 'react-native';

import type { SearchPathParts } from '../types';

const palette = {
  chipBg: '#f6efe2',
  chipBorder: '#e4d7b8',
  chipText: '#5a3d08',
};

const systemFont = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
  default: undefined,
}) as string | undefined;

/**
 * Flatten path_parts into an ordered, deduped, trimmed list of keywords
 * that represent the note: top_dir → subdirs → filename tokens.
 */
export function extractKeywords(pathParts: SearchPathParts | undefined | null): string[] {
  if (!pathParts) return [];
  const raw = [
    pathParts.top_dir,
    ...(pathParts.subdirs ?? []),
    ...(pathParts.filename_keywords ?? []),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

type NoteKeywordsProps = {
  pathParts: SearchPathParts | undefined | null;
};

/**
 * Row of keyword chips shown in the note detail pane (replaces the
 * old "Updated {mtime}" metadata row). Gracefully renders nothing when
 * there are no keywords.
 */
export function NoteKeywords({ pathParts }: NoteKeywordsProps) {
  const keywords = extractKeywords(pathParts);
  if (keywords.length === 0) return null;
  return (
    <View style={styles.row}>
      {keywords.map((kw) => (
        <View key={kw} style={styles.chip}>
          <Text style={styles.chipText}>{kw}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 18,
  },
  chip: {
    backgroundColor: palette.chipBg,
    borderColor: palette.chipBorder,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    color: palette.chipText,
    fontFamily: systemFont,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
