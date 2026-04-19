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
          // Style overrides for markdown elements - Light theme
          p: ({ children }) => <p className="mb-3 text-content-secondary leading-relaxed">{children}</p>,
          h1: ({ children }) => <h1 className="font-serif text-xl font-medium mb-3 text-content-primary">{children}</h1>,
          h2: ({ children }) => <h2 className="font-serif text-lg font-medium mb-3 text-content-primary">{children}</h2>,
          h3: ({ children }) => <h3 className="font-serif text-base font-medium mb-2 text-content-primary">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 text-content-secondary space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 text-content-secondary space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className
            return isInline ? (
              <code className="bg-surface-tertiary px-1.5 py-0.5 rounded text-sm font-mono text-brand-dark">
                {children}
              </code>
            ) : (
              <pre className="bg-surface-tertiary border border-border p-3 rounded-lg overflow-x-auto mb-3">
                <code className="text-sm font-mono text-content-secondary">{children}</code>
              </pre>
            )
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-brand pl-4 italic text-content-tertiary mb-3">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-dark hover:underline transition-colors duration-fast"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-content-primary">{children}</strong>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
