// Message types
export const MESSAGE_TYPES = {
  EXPLAIN_TERM: 'EXPLAIN_TERM',
  GET_PAGE_CONTENT: 'GET_PAGE_CONTENT',
  PANEL_READY: 'PANEL_READY',
  FOLLOW_UP: 'FOLLOW_UP',
  STREAM_CHUNK: 'STREAM_CHUNK',
  STREAM_DONE: 'STREAM_DONE',
  STREAM_ERROR: 'STREAM_ERROR',
} as const

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'skillmaxing-settings',
  CONVERSATIONS: 'skillmaxing-conversations',
} as const

// System prompt for the AI
export const SYSTEM_PROMPT = `You are a helpful assistant that explains terms in context. 
When given a term and page content, provide a clear, educational explanation 
that helps the user understand the term within the context of what they're reading.

Your explanations should be:
- Concise but informative
- Appropriate for a general educated audience
- Connected to the context of the page content when relevant
- Include practical examples when helpful

If the term is technical, briefly define it in simpler terms first.`
