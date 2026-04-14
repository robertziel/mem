import ReactMarkdown from 'react-markdown';

type MarkdownRendererProps = {
  content: string;
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div style={containerStyle}>
      <ReactMarkdown
        components={{
          code(props) {
            return <code style={inlineCodeStyle}>{props.children}</code>;
          },
          pre(props) {
            return <pre style={preStyle}>{props.children}</pre>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

const containerStyle = {
  color: '#18312e',
  fontFamily: '"Georgia", "Iowan Old Style", serif',
  fontSize: 16,
  lineHeight: 1.7,
};

const inlineCodeStyle = {
  backgroundColor: '#f2ead6',
  borderRadius: 6,
  padding: '0.1rem 0.3rem',
};

const preStyle = {
  backgroundColor: '#102926',
  borderRadius: 16,
  color: '#f7f1e4',
  overflowX: 'auto' as const,
  padding: '1rem',
};
