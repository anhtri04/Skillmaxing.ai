interface StreamingIndicatorProps {
  isLoading: boolean
  activeToolCall?: {
    toolName: string
    input?: Record<string, unknown>
  } | null
}

export function StreamingIndicator({ isLoading, activeToolCall }: StreamingIndicatorProps) {
  if (!isLoading) return null

  // Show tool-specific message when a tool is being called
  if (activeToolCall) {
    const { toolName, input } = activeToolCall
    
    // Format tool name for display (e.g., "web_search" → "web search")
    const displayName = toolName.replace(/_/g, ' ')
    
    // Show query if available (for web_search tool)
    const query = input?.query as string | undefined
    
    return (
      <div className="flex items-center space-x-2 text-content-tertiary text-sm py-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-brand rounded-full animate-typing-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-brand rounded-full animate-typing-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-brand rounded-full animate-typing-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <div className="flex flex-col">
          <span className="font-medium">Calling {displayName} tool</span>
          {query && (
            <span className="text-xs text-content-tertiary/70">
              Searching for "{query}"...
            </span>
          )}
        </div>
      </div>
    )
  }

  // Default thinking state
  return (
    <div className="flex items-center space-x-2 text-content-tertiary text-sm py-2">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-brand rounded-full animate-typing-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-brand rounded-full animate-typing-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-brand rounded-full animate-typing-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span className="font-medium">Thinking...</span>
    </div>
  )
}
