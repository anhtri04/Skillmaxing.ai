import type { SearchProviderType, SearchResult, WebSearchProvider } from '../../shared/types'
import { ExaProvider } from './exa-provider'
import { LinkupProvider } from './linkup-provider'
import { TavilyProvider } from './tavily-provider'
import { FirecrawlProvider } from './firecrawl-provider'
import { PerplexityProvider } from './perplexity-provider'

const providers: Record<SearchProviderType, WebSearchProvider> = {
  exa: new ExaProvider(),
  linkup: new LinkupProvider(),
  tavily: new TavilyProvider(),
  firecrawl: new FirecrawlProvider(),
  perplexity: new PerplexityProvider(),
}

export function getSearchProvider(providerName: SearchProviderType): WebSearchProvider {
  return providers[providerName] || providers.exa
}

export function formatSearchResultsForPrompt(results: SearchResult[]): string {
  if (results.length === 0) {
    return ''
  }

  const lines = results.map((result, index) => {
    const sourceName = result.title || getSourceNameFromUrl(result.url)
    return `[${index + 1}] ${sourceName}\nURL: ${result.url}\n${result.highlight}`
  })

  return `\n\nAdditional context from web search:\n${lines.join('\n\n')}`
}

export function getSourceNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export { providers }
export type { SearchResult, WebSearchProvider }
