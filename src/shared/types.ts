// Shared types used across all extension contexts

export interface ExtensionMessage {
  type: string
  term?: string
  pageContent?: string
  pageTitle?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: Date
}

export interface PageContent {
  title: string
  content: string
  url: string
  extractionMethod?: string
  usedFallback?: boolean
  duration?: number
}

export interface Settings {
  apiKey: string
  baseURL: string
  model: string
  searchProvider: 'exa' | 'linkup' | 'tavily' | 'firecrawl' | 'perplexity'
  exaApiKey: string
  linkupApiKey: string
  tavilyApiKey: string
  firecrawlApiKey: string
  perplexityApiKey: string
}

export function getSearchApiKey(settings: Settings): string {
  switch (settings.searchProvider) {
    case 'exa':
      return settings.exaApiKey
    case 'linkup':
      return settings.linkupApiKey
    case 'tavily':
      return settings.tavilyApiKey
    case 'firecrawl':
      return settings.firecrawlApiKey
    case 'perplexity':
      return settings.perplexityApiKey
    default:
      return settings.exaApiKey
  }
}

// Web Search Provider Types
export type SearchProviderType = 'exa' | 'linkup' | 'tavily' | 'firecrawl' | 'perplexity'

export interface SearchResult {
  id: string
  title: string
  url: string
  highlight: string
  score: number
  publishedDate?: string
  author?: string
}

export interface WebSearchProvider {
  name: string
  search(query: string, apiKey: string, numResults?: number): Promise<SearchResult[]>
}


