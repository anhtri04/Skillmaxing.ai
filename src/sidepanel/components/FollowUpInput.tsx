import { useState, useRef, useEffect } from 'react'

interface FollowUpInputProps {
  onSubmit: (message: string) => void
  isLoading: boolean
  disabled?: boolean
}

export function FollowUpInput({ onSubmit, isLoading, disabled }: FollowUpInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [input])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || disabled) return
    
    onSubmit(input.trim())
    setInput('')
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up question..."
            disabled={isLoading || disabled}
            rows={1}
            className="w-full px-4 py-3 bg-surface-tertiary border border-border rounded-xl focus:ring-2 focus:ring-brand focus:border-brand disabled:bg-surface-secondary disabled:opacity-50 resize-none min-h-[48px] max-h-[150px] text-content-primary placeholder:text-content-tertiary transition-all duration-normal"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim() || disabled}
          className="px-5 py-3 bg-brand text-white rounded-xl hover:bg-brand-dark hover:shadow-glow disabled:bg-neutral-light-gray disabled:cursor-not-allowed disabled:hover:shadow-none transition-all duration-normal whitespace-nowrap font-medium"
        >
          Send
        </button>
      </div>
      <p className="text-xs text-content-tertiary mt-2 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  )
}
