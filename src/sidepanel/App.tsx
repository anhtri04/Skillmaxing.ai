import { useState, useEffect, useRef, useCallback } from 'react'
import { MESSAGE_TYPES, STORAGE_KEYS } from '../shared/constants'
import type { ExtensionMessage } from '../shared/types'
import { AssistantMessage } from './components/AssistantMessage'
import { UserMessage } from './components/UserMessage'
import { StreamingIndicator } from './components/StreamingIndicator'
import { FollowUpInput } from './components/FollowUpInput'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function App() {
  const [pendingTerm, setPendingTerm] = useState<string | null>(null)
  const [pageTitle, setPageTitle] = useState<string | null>(null)
  const [pageContent, setPageContent] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasExplained, setHasExplained] = useState(false)
  const [currentTabId, setCurrentTabId] = useState<number | null>(null)
  const portRef = useRef<chrome.runtime.Port | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get current tab ID
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        setCurrentTabId(tabs[0].id)
      }
    })
  }, [])

  // Load conversation from storage when tab changes
  useEffect(() => {
    if (currentTabId !== null) {
      loadConversation(currentTabId)
    }
  }, [currentTabId])

  // Save conversation to storage when messages change
  useEffect(() => {
    if (currentTabId !== null && messages.length > 0) {
      saveConversation(currentTabId, messages)
    }
  }, [messages, currentTabId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Listen for messages from background script
  useEffect(() => {
    const handler = (msg: ExtensionMessage & { tabId?: number }) => {
      if (msg.type === MESSAGE_TYPES.EXPLAIN_TERM) {
        // Check if this message is for the current tab
        setPendingTerm(msg.term || null)
        setPageTitle(msg.pageTitle || null)
        setPageContent(msg.pageContent || null)
        setHasExplained(false)
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

  const loadConversation = async (tabId: number) => {
    try {
      const result = await chrome.storage.session.get([`conversation-${tabId}`])
      const savedConversation = result[`conversation-${tabId}`] as { term: string; messages: Message[]; pageTitle: string | null; pageContent: string | null } | undefined
      
      if (savedConversation) {
        setPendingTerm(savedConversation.term)
        setMessages(savedConversation.messages)
        setPageTitle(savedConversation.pageTitle)
        setPageContent(savedConversation.pageContent)
        setHasExplained(true)
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
    }
  }

  const saveConversation = async (tabId: number, msgs: Message[]) => {
    if (!pendingTerm) return
    
    try {
      await chrome.storage.session.set({
        [`conversation-${tabId}`]: {
          term: pendingTerm,
          messages: msgs,
          pageTitle,
          pageContent,
          timestamp: Date.now(),
        }
      })
    } catch (error) {
      console.error('Error saving conversation:', error)
    }
  }

  const clearConversation = () => {
    if (currentTabId !== null) {
      chrome.storage.session.remove([`conversation-${currentTabId}`])
    }
    setPendingTerm(null)
    setMessages([])
    setHasExplained(false)
    setError(null)
    setPageTitle(null)
    setPageContent(null)
  }

  const sendMessage = useCallback(async (content: string, isInitial = false) => {
    if (!pendingTerm) return
    
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

    // Disconnect any existing port
    if (portRef.current) {
      portRef.current.disconnect()
    }

    // Create port connection
    const port = chrome.runtime.connect({ name: 'skillmaxing-stream' })
    portRef.current = port

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
    }
    setMessages(prev => [...prev, userMessage])

    // Initialize assistant message
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    }
    setMessages(prev => [...prev, assistantMessage])

    // Send start stream message - filter out empty messages
    const allMessages = isInitial 
      ? [userMessage] 
      : [...messages.filter(m => m.content.trim() !== ''), userMessage]
    
    port.postMessage({
      type: 'START_STREAM',
      messages: allMessages,
      term: pendingTerm,
      pageTitle,
      pageContent,
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
  }, [pendingTerm, pageTitle, pageContent, messages])

  const sendExplanation = async (term: string, _title: string | null, _content: string | null) => {
    await sendMessage(`Please explain "${term}"`, true)
  }

  const handleFollowUp = (content: string) => {
    sendMessage(content, false)
  }

  return (
    <div className="min-h-screen bg-surface-primary flex flex-col">
      {/* Header */}
      <div className="bg-surface-secondary border-b border-[rgba(255,255,255,0.1)] p-4">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gradient">
            Skillmaxing.ai
          </h1>
          {pendingTerm && (
            <button
              onClick={clearConversation}
              className="text-sm text-content-tertiary hover:text-brand transition-colors duration-fast"
            >
              New Conversation
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto">
          {!pendingTerm ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-brand to-brand-dark shadow-glow flex items-center justify-center">
                <span className="text-2xl font-bold text-white">S</span>
              </div>
              <p className="text-content-secondary">
                Select any text on a page, right-click, and choose "Explain with Skillmaxing" to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Term Header */}
              <div className="bg-surface-secondary border border-[rgba(255,255,255,0.1)] rounded-lg-md shadow-elevated p-4">
                <h2 className="text-sm font-semibold text-content-tertiary mb-1">
                  Explaining:
                </h2>
                <p className="text-xl font-bold text-gradient">
                  "{pendingTerm}"
                </p>
                {pageTitle && (
                  <p className="text-sm text-content-tertiary mt-1">
                    from "{pageTitle}"
                  </p>
                )}
              </div>

              {/* Messages */}
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id}>
                    {message.role === 'user' ? (
                      <UserMessage content={message.content} />
                    ) : (
                      <div className="bg-surface-secondary border border-[rgba(255,255,255,0.1)] mr-8 p-4 rounded-lg-md shadow-elevated">
                        <AssistantMessage content={message.content} />
                      </div>
                    )}
                  </div>
                ))}

                <StreamingIndicator isLoading={isLoading} />

                {error && (
                  <div className="bg-brand-subtle border border-brand p-4 rounded-lg-md">
                    <p className="text-brand-light text-sm">
                      Error: {error.message}
                    </p>
                    <button
                      onClick={() => chrome.runtime.openOptionsPage()}
                      className="text-brand hover:text-brand-light hover:underline text-sm mt-2 transition-colors duration-fast"
                    >
                      Configure API Key →
                    </button>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      {pendingTerm && (
        <div className="bg-surface-secondary border-t border-[rgba(255,255,255,0.1)] p-4">
          <div className="max-w-md mx-auto">
            <FollowUpInput
              onSubmit={handleFollowUp}
              isLoading={isLoading}
              disabled={!pendingTerm}
            />
            <div className="text-center mt-2">
              <button
                onClick={() => chrome.runtime.openOptionsPage()}
                className="text-xs text-content-tertiary hover:text-brand transition-colors duration-fast"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
