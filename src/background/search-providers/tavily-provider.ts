import type { SearchResult, WebSearchProvider } from '../../shared/types'

export class TavilyProvider implements WebSearchProvider {
  name = 'tavily'

  async search(query: string, apiKey: string, numResults: number = 5): Promise<SearchResult[]> {
    if (!apiKey) {
      throw new Error('Tavily API key not configured')
    }

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        include_answer: false,
        max_results: numResults,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Tavily API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid response from Tavily API')
    }

    return data.results.map((result: unknown, index: number) => {
      const r = result as {
        title?: string
        url?: string
        content?: string
        score?: number
        published_date?: string
      }
      return {
        id: `tavily-${index}`,
        title: r.title || 'Untitled',
        url: r.url || '',
        highlight: r.content || '',
        score: r.score || 0,
        publishedDate: r.published_date,
      }
    })
  }
}
