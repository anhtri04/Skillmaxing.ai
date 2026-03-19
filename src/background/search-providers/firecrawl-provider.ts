import type { SearchResult, WebSearchProvider } from '../../shared/types'

export class FirecrawlProvider implements WebSearchProvider {
  name = 'firecrawl'

  async search(query: string, apiKey: string, numResults: number = 5): Promise<SearchResult[]> {
    if (!apiKey) {
      throw new Error('Firecrawl API key not configured')
    }

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        limit: numResults,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // Firecrawl response format: { success: true, data: [...] }
    // Each item has: url, title, description
    if (!data.success || !data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid response from Firecrawl API')
    }

    return data.data.map((result: unknown, index: number) => {
      const r = result as {
        title?: string
        url?: string
        description?: string
        markdown?: string
      }
      return {
        id: `firecrawl-${index}`,
        title: r.title || 'Untitled',
        url: r.url || '',
        highlight: r.markdown || r.description || '',
        score: 0,
      }
    })
  }
}
