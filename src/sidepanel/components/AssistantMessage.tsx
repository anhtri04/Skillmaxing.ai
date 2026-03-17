import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AssistantMessageProps {
  content: string
}

export function AssistantMessage({ content }: AssistantMessageProps) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Style overrides for markdown elements
          p: ({ children }) => <p className="mb-2 text-gray-800">{children}</p>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-gray-900">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-gray-900">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-1 text-gray-900">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 text-gray-800">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 text-gray-800">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className
            return isInline ? (
              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800">
                {children}
              </code>
            ) : (
              <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto mb-2">
                <code className="text-sm font-mono text-gray-800">{children}</code>
              </pre>
            )
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-600 mb-2">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
