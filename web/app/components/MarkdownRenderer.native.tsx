import Markdown from 'react-native-markdown-display';

type MarkdownRendererProps = {
  content: string;
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <Markdown
      style={{
        body: {
          color: '#18312e',
          fontSize: 16,
          lineHeight: 26,
        },
        heading1: {
          color: '#102926',
          marginBottom: 12,
        },
        heading2: {
          color: '#102926',
          marginBottom: 10,
        },
        code_inline: {
          backgroundColor: '#f2ead6',
          borderRadius: 4,
          paddingHorizontal: 4,
        },
        code_block: {
          backgroundColor: '#102926',
          borderRadius: 16,
          color: '#f7f1e4',
          padding: 16,
        },
      }}
    >
      {content}
    </Markdown>
  );
}
