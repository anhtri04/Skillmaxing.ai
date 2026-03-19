import type { SearchResult, WebSearchProvider } from '../../shared/types'

export class LinkupProvider implements WebSearchProvider {
  name = 'linkup'

  async search(query: string, apiKey: string, numResults: number = 5): Promise<SearchResult[]> {
    if (!apiKey) {
      throw new Error('Linkup API key not configured')
    }

    const response = await fetch('https://api.linkup.so/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        q: query,
        depth: 'standard',
        outputType: 'searchResults',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Linkup API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // Linkup response format: { results: [...] } or { sources: [...] } depending on outputType
    // When outputType is 'searchResults', results are in data.results
    // When outputType is 'sourcedAnswer', results are in data.sources
    const results = data.results || data.sources || []
    
    if (!Array.isArray(results)) {
      throw new Error('Invalid response from Linkup API')
    }

    return results.slice(0, numResults).map((result: unknown, index: number) => {
      const r = result as {
        name?: string
        title?: string
        url?: string
        snippet?: string
        description?: string
      }
      return {
        id: `linkup-${index}`,
        title: r.name || r.title || 'Untitled',
        url: r.url || '',
        highlight: r.snippet || r.description || '',
        score: 0,
      }
    })
  }
}
