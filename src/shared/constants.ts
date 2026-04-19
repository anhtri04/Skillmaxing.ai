// Message types
export const MESSAGE_TYPES = {
  EXPLAIN_TERM: 'EXPLAIN_TERM',
  GET_PAGE_CONTENT: 'GET_PAGE_CONTENT',
  PANEL_READY: 'PANEL_READY',
  FOLLOW_UP: 'FOLLOW_UP',
  STREAM_CHUNK: 'STREAM_CHUNK',
  STREAM_DONE: 'STREAM_DONE',
  STREAM_ERROR: 'STREAM_ERROR',
  TOOL_CALL_START: 'TOOL_CALL_START',
  TOOL_CALL_END: 'TOOL_CALL_END',
} as const

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'skillmaxing-settings',
  CONVERSATIONS: 'skillmaxing-conversations',
  CONVERSATIONS_MAP: 'skillmaxing-conversations-map',
} as const

// System prompt for the AI
export const SYSTEM_PROMPT = `You are a helpful assistant that explains terms in context with web search support.

You MUST use the web_search tool to find additional context about the term before explaining. The tool will search the web for relevant information about the term.

When explaining, follow these guidelines:
- Use information from web search results to enhance your explanation
- Provide clear, educational explanations appropriate for a general educated audience
- Connect the explanation to the page content context when relevant
- Include practical examples when helpful
- If the term is technical, briefly define it in simpler terms first

CITATION FORMAT:
You MUST cite sources using the format [Source Name](URL) where:
- "Source Name" is either the article title from the search result or the domain name (e.g., "example.com")
- "URL" is the full URL from the search result

Always include citations when referencing information from web search results.`
