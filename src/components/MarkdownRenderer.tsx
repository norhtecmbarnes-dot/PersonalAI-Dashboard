'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content text-sm ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 whitespace-pre-wrap">{children}</p>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-4">{children}</h2>,
          h3: ({ children }) => <h3 className="text-md font-bold mb-2 mt-3">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-bold mb-2 mt-3">{children}</h4>,
          ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="whitespace-pre-wrap pl-1">{children}</li>,
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            return isInline ? (
              <code
                className="bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono text-purple-300"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className={`block bg-gray-900 p-3 rounded-lg text-xs font-mono overflow-x-auto my-2 ${className || ''}`}
              >
                <pre className="whitespace-pre-wrap">{children}</pre>
              </code>
            );
          },
          strong: ({ children }) => (
            <strong className="font-bold text-purple-300">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-400 my-3">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full border border-gray-700 rounded-lg">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-800">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-700">{children}</tr>,
          th: ({ children }) => (
            <th className="text-left p-3 font-semibold border-r border-gray-700 bg-gray-800">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="p-3 border-r border-gray-700">{children}</td>,
          hr: () => <hr className="border-gray-700 my-4" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
