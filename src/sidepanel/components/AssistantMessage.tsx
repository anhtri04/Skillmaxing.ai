import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AssistantMessageProps {
  content: string
}

export function AssistantMessage({ content }: AssistantMessageProps) {
  return (
    <div className="prose prose-sm max-w-none prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Style overrides for markdown elements
          p: ({ children }) => <p className="mb-2 text-content-secondary leading-relaxed">{children}</p>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-2 text-content-primary">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2 text-content-primary">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-1 text-content-primary">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 text-content-secondary">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 text-content-secondary">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className
            return isInline ? (
              <code className="bg-surface-tertiary px-1.5 py-0.5 rounded-sm text-sm font-mono text-brand-light">
                {children}
              </code>
            ) : (
              <pre className="bg-neutral-black border border-[rgba(255,255,255,0.1)] p-3 rounded-md overflow-x-auto mb-2">
                <code className="text-sm font-mono text-content-secondary">{children}</code>
              </pre>
            )
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-brand pl-4 italic text-content-tertiary mb-2">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-light hover:underline transition-colors duration-fast"
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
