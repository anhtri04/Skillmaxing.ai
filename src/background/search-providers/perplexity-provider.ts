import type { SearchResult, WebSearchProvider } from '../../shared/types'

export class PerplexityProvider implements WebSearchProvider {
  name = 'perplexity'

  async search(query: string, apiKey: string, numResults: number = 5): Promise<SearchResult[]> {
    if (!apiKey) {
      throw new Error('Perplexity API key not configured')
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful search assistant. Search the web and provide relevant results with sources.'
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      throw new Error('Invalid response from Perplexity API')
    }

    const content = data.choices[0].message.content
    
    // Extract citations if available
    const citations = data.citations || []
    
    if (citations.length > 0) {
      return citations.slice(0, numResults).map((citation: unknown, index: number) => {
        const c = citation as { url?: string; title?: string }
        return {
          id: `perplexity-${index}`,
          title: c.title || 'Untitled',
          url: c.url || '',
          highlight: '',
          score: 0,
        }
      })
    }

    // Fallback: return single result with the response content
    return [{
      id: 'perplexity-0',
      title: 'Perplexity Search Result',
      url: '',
      highlight: content,
      score: 1,
    }]
  }
}
