import { useState, useEffect, useRef, useCallback } from 'react'
import { MESSAGE_TYPES, STORAGE_KEYS } from '../shared/constants'
import { normalizeUrl } from '../shared/url-utils'
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
  const [currentPageUrl, setCurrentPageUrl] = useState<string | null>(null)
  const portRef = useRef<chrome.runtime.Port | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastExplainedTermRef = useRef<string | null>(null)
  const incomingTermRef = useRef<string | null>(null)
  const [explainedTerms, setExplainedTerms] = useState<Set<string>>(new Set())

  // Save conversation to storage when messages change
  useEffect(() => {
    if (currentPageUrl && messages.length > 0) {
      saveConversation(currentPageUrl, messages)
    }
  }, [messages, currentPageUrl])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Listen for messages from background script
  useEffect(() => {
    const handler = async (msg: ExtensionMessage & { tabId?: number; pageUrl?: string }) => {
      console.log('[Skillmaxing:SidePanel] Message received:', msg.type, 'term:', msg.term)
      if (msg.type === MESSAGE_TYPES.EXPLAIN_TERM) {
        const newTerm = msg.term || null
        const newPageUrl = msg.pageUrl || null

        console.log('[Skillmaxing:SidePanel] newTerm:', newTerm, 'currentPageUrl:', currentPageUrl)

        // Check if we're on a different page - load conversation for new URL
        if (newPageUrl && newPageUrl !== currentPageUrl) {
          console.log('[Skillmaxing:SidePanel] URL changed from', currentPageUrl, 'to', newPageUrl)
          setCurrentPageUrl(newPageUrl)
          lastExplainedTermRef.current = null
          incomingTermRef.current = newTerm
          console.log('[Skillmaxing:SidePanel] Set incomingTermRef =', newTerm)
          // Load conversation for new URL (will restore if exists, or set empty state)
          await loadConversation(newPageUrl)
          console.log('[Skillmaxing:SidePanel] loadConversation returned')
        }

        // Only reset hasExplained if it's a different term
        if (newTerm !== pendingTerm) {
          setHasExplained(false)
        }

        setPendingTerm(newTerm)
        setPageTitle(msg.pageTitle || null)
        setPageContent(msg.pageContent || null)
        setError(null)
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [pendingTerm, currentPageUrl])

  // Auto-trigger explanation when term is received
  useEffect(() => {
    console.log('[Skillmaxing:AutoTrigger] Effect running:', { pendingTerm, hasExplained, isLoading, explainedTermsSize: explainedTerms.size })
    if (pendingTerm && !hasExplained && !isLoading) {
      console.log('[Skillmaxing:AutoTrigger] Conditions met, checking term')
      // Check if term was already explained on this page
      const normalizedTerm = pendingTerm.toLowerCase().trim()
      if (explainedTerms.has(normalizedTerm)) {
        console.log(`[Skillmaxing:AutoExplain] Term "${pendingTerm}" already explained, skipping`)
        setHasExplained(true) // Mark as explained so UI shows existing conversation
        return
      }
      
      // Prevent duplicate API calls for the same term
      if (lastExplainedTermRef.current === pendingTerm) {
        console.log('[Skillmaxing:AutoTrigger] Term already in lastExplainedTermRef, skipping')
        return
      }
      console.log('[Skillmaxing:AutoTrigger] Calling sendExplanation for:', pendingTerm)
      lastExplainedTermRef.current = pendingTerm
      setHasExplained(true)
      sendExplanation(pendingTerm, pageTitle, pageContent)
    } else {
      console.log('[Skillmaxing:AutoTrigger] Conditions NOT met:', { pendingTerm: !!pendingTerm, hasExplained, isLoading })
    }
  }, [pendingTerm, hasExplained, isLoading, pageTitle, pageContent, explainedTerms])

  const loadConversation = async (pageUrl: string) => {
    if (!pageUrl) return
    
    const normalizedUrl = normalizeUrl(pageUrl)
    
    try {
      const result = await chrome.storage.session.get([STORAGE_KEYS.CONVERSATIONS_MAP])
      const conversationsMap = (result[STORAGE_KEYS.CONVERSATIONS_MAP] as Record<string, {
        term: string
        messages: Message[]
        pageTitle: string | null
        pageContent: string | null
      }>) || {}
      
      const savedConversation = conversationsMap[normalizedUrl]
      
      if (savedConversation) {
        setPendingTerm(savedConversation.term)
        setMessages(savedConversation.messages)
        setPageTitle(savedConversation.pageTitle)
        setPageContent(savedConversation.pageContent)
        setHasExplained(true)
        
        // Restore explained terms from message history
        const terms = new Set<string>()
        savedConversation.messages.forEach(msg => {
          if (msg.role === 'user') {
            // Extract term from "Please explain \"term\"" format
            const match = msg.content.match(/please explain "([^"]+)"/i)
            if (match) {
              terms.add(match[1].toLowerCase().trim())
            } else {
              // For follow-up messages or other formats, use full content
              terms.add(msg.content.toLowerCase().trim())
            }
          }
        })
        setExplainedTerms(terms)
      } else {
        // No saved conversation for this URL - start fresh
        console.log('[Skillmaxing:LoadConv] No saved conversation, checking incomingTermRef:', incomingTermRef.current)
        if (incomingTermRef.current) {
          // Clear existing messages before starting new conversation for different page
          console.log('[Skillmaxing:LoadConv] Clearing messages for new page conversation')
          setMessages([])
          setHasExplained(false)
          setExplainedTerms(new Set())
          lastExplainedTermRef.current = null
          console.log('[Skillmaxing:LoadConv] Preserving incoming term, setting pendingTerm')
          setPendingTerm(incomingTermRef.current)
          return
        }
        console.log('[Skillmaxing:LoadConv] No incoming term, resetting state')
        setPendingTerm(null)
        setMessages([])
        setHasExplained(false)
        setExplainedTerms(new Set())
        lastExplainedTermRef.current = null
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
    }
  }

  const saveConversation = async (pageUrl: string, msgs: Message[]) => {
    if (!pageUrl || !pendingTerm) return
    
    const normalizedUrl = normalizeUrl(pageUrl)
    
    try {
      const result = await chrome.storage.session.get([STORAGE_KEYS.CONVERSATIONS_MAP])
      const conversationsMap = (result[STORAGE_KEYS.CONVERSATIONS_MAP] as Record<string, {
        term: string
        messages: Message[]
        pageTitle: string | null
        pageContent: string | null
        timestamp: number
        explainedTerms?: string[]
      }>) || {}
      
      conversationsMap[normalizedUrl] = {
        term: pendingTerm,
        messages: msgs,
        pageTitle,
        pageContent,
        timestamp: Date.now(),
        explainedTerms: Array.from(explainedTerms),
      }
      
      await chrome.storage.session.set({
        [STORAGE_KEYS.CONVERSATIONS_MAP]: conversationsMap
      })
    } catch (error) {
      console.error('Error saving conversation:', error)
    }
  }

  const clearConversation = () => {
    if (currentPageUrl) {
      const normalizedUrl = normalizeUrl(currentPageUrl)
      // Remove this URL's conversation from the map
      chrome.storage.session.get([STORAGE_KEYS.CONVERSATIONS_MAP]).then(result => {
        const conversationsMap = (result[STORAGE_KEYS.CONVERSATIONS_MAP] as Record<string, unknown>) || {}
        delete conversationsMap[normalizedUrl]
        chrome.storage.session.set({ [STORAGE_KEYS.CONVERSATIONS_MAP]: conversationsMap })
      })
    }
    setPendingTerm(null)
    setMessages([])
    setHasExplained(false)
    setError(null)
    setPageTitle(null)
    setPageContent(null)
    lastExplainedTermRef.current = null
    setExplainedTerms(new Set())
  }

  const sendMessage = useCallback(async (content: string, isInitial = false) => {
    if (!pendingTerm) return
    
    // Check for duplicate term (case-insensitive)
    if (isInitial) {
      const normalizedTerm = pendingTerm.toLowerCase().trim()
      if (explainedTerms.has(normalizedTerm)) {
        console.log(`[Skillmaxing] Term "${pendingTerm}" already explained on this page`)
        return
      }
      // Add to explained terms
      setExplainedTerms(prev => new Set([...prev, normalizedTerm]))
    }
    
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
  }, [pendingTerm, pageTitle, pageContent, messages, explainedTerms])

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
