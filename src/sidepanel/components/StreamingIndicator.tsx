interface StreamingIndicatorProps {
  isLoading: boolean
}

export function StreamingIndicator({ isLoading }: StreamingIndicatorProps) {
  if (!isLoading) return null

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
