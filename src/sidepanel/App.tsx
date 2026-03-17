import { useState, useEffect, useRef } from 'react'
import { MESSAGE_TYPES, STORAGE_KEYS } from '../shared/constants'
import type { ExtensionMessage } from '../shared/types'
import { AssistantMessage } from './components/AssistantMessage'
import { StreamingIndicator } from './components/StreamingIndicator'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function App() {
  const [pendingTerm, setPendingTerm] = useState<string | null>(null)
  const [pageTitle, setPageTitle] = useState<string | null>(null)
  const [pageContent, setPageContent] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasExplained, setHasExplained] = useState(false)
  const portRef = useRef<chrome.runtime.Port | null>(null)

  // Listen for messages from background script
  useEffect(() => {
    const handler = (msg: ExtensionMessage) => {
      if (msg.type === MESSAGE_TYPES.EXPLAIN_TERM) {
        setPendingTerm(msg.term || null)
        setPageTitle(msg.pageTitle || null)
        setPageContent(msg.pageContent || null)
        setHasExplained(false)
        setMessages([])
        setError(null)
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  // Auto-trigger explanation when term is received
  useEffect(() => {
    if (pendingTerm && !hasExplained && !isLoading && messages.length === 0) {
      setHasExplained(true)
      sendExplanation(pendingTerm, pageTitle, pageContent)
    }
  }, [pendingTerm, hasExplained, isLoading, messages.length, pageTitle, pageContent])

  const sendExplanation = async (term: string, title: string | null, content: string | null) => {
    setIsLoading(true)
    setError(null)

    // Check for API key
    const settings = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS])
    const settingsData = settings[STORAGE_KEYS.SETTINGS] as { apiKey?: string } | undefined
    if (!settingsData?.apiKey) {
      setError(new Error('No API key configured. Please set up your API key in the extension options.'))
      setIsLoading(false)
      return
    }

    // Create port connection
    const port = chrome.runtime.connect({ name: 'skillmaxing-stream' })
    portRef.current = port

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: `Please explain "${term}"`,
    }
    setMessages(prev => [...prev, userMessage])

    // Initialize assistant message
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    }
    setMessages(prev => [...prev, assistantMessage])

    // Send start stream message
    port.postMessage({
      type: 'START_STREAM',
      messages: [userMessage],
      term,
      pageTitle: title,
      pageContent: content,
    })

    // Listen for stream messages
    port.onMessage.addListener((message: { type: string; chunk?: string; error?: string }) => {
      if (message.type === MESSAGE_TYPES.STREAM_CHUNK && message.chunk) {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: lastMessage.content + message.chunk }
            ]
          }
          return prev
        })
      } else if (message.type === MESSAGE_TYPES.STREAM_DONE) {
        setIsLoading(false)
        port.disconnect()
        portRef.current = null
      } else if (message.type === MESSAGE_TYPES.STREAM_ERROR) {
        setError(new Error(message.error || 'Stream error'))
        setIsLoading(false)
        port.disconnect()
        portRef.current = null
      }
    })

    port.onDisconnect.addListener(() => {
      if (isLoading) {
        setIsLoading(false)
      }
      portRef.current = null
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !pendingTerm) return

    // Check for API key
    chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
      const settingsData = result[STORAGE_KEYS.SETTINGS] as { apiKey?: string } | undefined
      if (!settingsData?.apiKey) {
        setError(new Error('No API key configured. Please set up your API key in the extension options.'))
        return
      }

      setIsLoading(true)
      setError(null)
      setInput('')

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: input.trim(),
      }
      setMessages(prev => [...prev, userMessage])

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      }
      setMessages(prev => [...prev, assistantMessage])

      const port = chrome.runtime.connect({ name: 'skillmaxing-stream' })
      portRef.current = port

      port.postMessage({
        type: 'START_STREAM',
        messages: [...messages, userMessage],
        term: pendingTerm,
        pageTitle,
        pageContent,
      })

      port.onMessage.addListener((message: { type: string; chunk?: string; error?: string }) => {
        if (message.type === MESSAGE_TYPES.STREAM_CHUNK && message.chunk) {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1]
            if (lastMessage.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + message.chunk }
              ]
            }
            return prev
          })
        } else if (message.type === MESSAGE_TYPES.STREAM_DONE) {
          setIsLoading(false)
          port.disconnect()
          portRef.current = null
        } else if (message.type === MESSAGE_TYPES.STREAM_ERROR) {
          setError(new Error(message.error || 'Stream error'))
          setIsLoading(false)
          port.disconnect()
          portRef.current = null
        }
      })

      port.onDisconnect.addListener(() => {
        if (isLoading) {
          setIsLoading(false)
        }
        portRef.current = null
      })
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-blue-600 mb-4">
            Skillmaxing.ai
          </h1>
          
          {!pendingTerm ? (
            <p className="text-gray-600">
              Select any text on a page, right-click, and choose "Explain with Skillmaxing" to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Term Header */}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-sm font-semibold text-gray-500 mb-1">
                  Explaining:
                </h2>
                <p className="text-xl font-bold text-blue-600">
                  "{pendingTerm}"
                </p>
                {pageTitle && (
                  <p className="text-sm text-gray-500 mt-1">
                    from "{pageTitle}"
                  </p>
                )}
              </div>

              {/* Messages */}
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg shadow ${
                      message.role === 'user'
                        ? 'bg-blue-50 ml-8'
                        : 'bg-white mr-8'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p className="text-gray-800">{message.content}</p>
                    ) : (
                      <AssistantMessage content={message.content} />
                    )}
                  </div>
                ))}
                
                <StreamingIndicator isLoading={isLoading} />
                
                {error && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <p className="text-red-600 text-sm">
                      Error: {error.message}
                    </p>
                    <button
                      onClick={() => chrome.runtime.openOptionsPage()}
                      className="text-blue-600 hover:underline text-sm mt-2"
                    >
                      Configure API Key →
                    </button>
                  </div>
                )}
              </div>

              {/* Follow-up Input */}
              <form onSubmit={handleSubmit} className="mt-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask a follow-up question..."
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Send
                  </button>
                </div>
              </form>

              {/* Settings Link */}
              <div className="text-center mt-4">
                <button
                  onClick={() => chrome.runtime.openOptionsPage()}
                  className="text-sm text-gray-500 hover:text-blue-600"
                >
                  Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
