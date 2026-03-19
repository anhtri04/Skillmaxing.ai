import type { ExaSearchResult } from '../shared/types'

const EXA_API_URL = 'https://api.exa.ai/search'

export async function searchWithExa(
  query: string,
  apiKey: string,
  numResults: number = 5
): Promise<ExaSearchResult[]> {
  if (!apiKey) {
    throw new Error('Exa API key not configured')
  }

  const response = await fetch(EXA_API_URL, {
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

export function formatSearchResultsForPrompt(results: ExaSearchResult[]): string {
  if (results.length === 0) {
    return ''
  }

  const lines = results.map((result, index) => {
    const sourceName = result.title || new URL(result.url).hostname
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