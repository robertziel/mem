import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <div className="markdown-body">
      <Markdown rehypePlugins={[rehypeHighlight]}>{content}</Markdown>
    </div>
  );
}
