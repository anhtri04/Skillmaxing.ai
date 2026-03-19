import type { SearchResult, WebSearchProvider } from '../../shared/types'

export class ExaProvider implements WebSearchProvider {
  name = 'exa'

  async search(query: string, apiKey: string, numResults: number = 5): Promise<SearchResult[]> {
    if (!apiKey) {
      throw new Error('Exa API key not configured')
    }

    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        numResults,
        type: 'neural',
        highlights: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Exa API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid response from Exa API')
    }

    return data.results.map((result: unknown) => {
      const r = result as {
        id?: string
        title?: string
        url?: string
        highlights?: string[]
        score?: number
        publishedDate?: string
        author?: string
      }
      return {
        id: r.id || '',
        title: r.title || 'Untitled',
        url: r.url || '',
        highlight: r.highlights?.[0] || '',
        score: r.score || 0,
        publishedDate: r.publishedDate,
        author: r.author,
      }
    })
  }
}
