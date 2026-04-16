import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';

// Common languages
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import html from 'highlight.js/lib/languages/xml';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import plaintext from 'highlight.js/lib/languages/plaintext';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import yaml from 'highlight.js/lib/languages/yaml';
// Extras
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import nginx from 'highlight.js/lib/languages/nginx';
import http from 'highlight.js/lib/languages/http';
import protobuf from 'highlight.js/lib/languages/protobuf';
import erb from 'highlight.js/lib/languages/erb';
import properties from 'highlight.js/lib/languages/properties';
import makefile from 'highlight.js/lib/languages/makefile';
import lua from 'highlight.js/lib/languages/lua';

type MarkdownRendererProps = {
  content: string;
};

const highlightLanguages = {
  bash,
  sh: bash,
  shell: bash,
  css,
  go,
  html,
  xml: html,
  ini,
  toml: ini,
  java,
  javascript,
  js: javascript,
  jsx: javascript,
  json,
  jsonl: json,
  markdown,
  md: markdown,
  plaintext,
  text: plaintext,
  python,
  py: python,
  ruby,
  rb: ruby,
  sql,
  typescript,
  ts: typescript,
  tsx: typescript,
  yaml,
  yml: yaml,
  dockerfile,
  docker: dockerfile,
  nginx,
  http,
  protobuf,
  proto: protobuf,
  erb,
  properties,
  makefile,
  make: makefile,
  lua,
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="mem-markdown" style={containerStyle}>
      <style>{scopedCss}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [
            rehypeHighlight,
            {
              detect: false,
              ignoreMissing: true,
              languages: highlightLanguages,
            },
          ],
        ]}
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

const scopedCss = `
/* Inline code — only when NOT inside a <pre> */
.mem-markdown :not(pre) > code {
  background-color: #f2ead6;
  border-radius: 6px;
  padding: 0.1rem 0.3rem;
  font-family: "SF Mono", "Cascadia Code", "Fira Code", ui-monospace, monospace;
  font-size: 0.9em;
  color: #3d2d14;
}
/* Block code container */
.mem-markdown pre {
  background-color: #282c34;
  border-radius: 16px;
  overflow-x: auto;
  padding: 1rem;
  margin: 1em 0;
}
/* Block code text — atom-one-dark foreground for readability */
.mem-markdown pre code,
.mem-markdown pre code.hljs {
  background-color: transparent;
  padding: 0;
  font-size: 0.9em;
  display: block;
  white-space: pre;
  font-family: "SF Mono", "Cascadia Code", "Fira Code", ui-monospace, monospace;
  color: #abb2bf;
}
.mem-markdown a {
  color: #7b5b2a;
  text-decoration: underline;
  text-decoration-color: rgba(123, 91, 42, 0.4);
  text-underline-offset: 2px;
}
.mem-markdown a:hover {
  text-decoration-color: #7b5b2a;
}
.mem-markdown table {
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
  font-size: 0.95em;
  background-color: #fffaf0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 0 0 1px #eadcc2;
}
.mem-markdown th,
.mem-markdown td {
  border-bottom: 1px solid #eadcc2;
  padding: 10px 14px;
  text-align: left;
  vertical-align: top;
}
.mem-markdown th {
  background-color: #f6efe2;
  color: #102926;
  font-weight: 700;
}
.mem-markdown tr:last-child td {
  border-bottom: 0;
}
.mem-markdown tbody tr:nth-child(even) td {
  background-color: #faf3e3;
}
.mem-markdown del {
  color: #8a7b5c;
}
.mem-markdown input[type="checkbox"] {
  margin-right: 0.5em;
  transform: translateY(1px);
}
.mem-markdown ul li.task-list-item {
  list-style: none;
  margin-left: -1.25em;
}
`;
