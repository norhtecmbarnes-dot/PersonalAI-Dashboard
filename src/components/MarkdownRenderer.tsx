'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-content text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-md font-bold mb-1">{children}</h3>,
           ul: ({ children }) => <ul className="list-disc ml-4 mb-2" style={{ listStyleType: 'disc' }}>{children}</ul>,
           ol: ({ children }) => <ol className="list-decimal ml-4 mb-2" style={{ listStyleType: 'decimal' }}>{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ className, children }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-gray-600 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
            ) : (
              <code className={`block bg-gray-900 p-2 rounded text-xs font-mono overflow-x-auto ${className || ''}`}>
                <pre>{children}</pre>
              </code>
            );
          },
          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-500 pl-3 italic text-gray-400 my-2">
              {children}
            </blockquote>
          ),
           table: ({ children }) => (
             <table className="w-full border border-gray-700 border-collapse my-2 text-xs table-auto">
               {children}
             </table>
           ),
          thead: ({ children }) => <thead className="bg-gray-700">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-700">{children}</tr>,
           th: ({ children }) => <th className="text-left p-2 border border-gray-600">{children}</th>,
           td: ({ children }) => <td className="p-2 border border-gray-600">{children}</td>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}