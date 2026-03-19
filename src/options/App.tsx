import { useState, useEffect } from 'react'
import { STORAGE_KEYS } from '../shared/constants'
import type { Settings, SearchProviderType } from '../shared/types'

const PROVIDER_PRESETS = {
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  groq: { baseURL: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant' },
  openrouter: { baseURL: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  ollama: { baseURL: 'http://localhost:11434/api', model: 'llama3.2' },
}

const SEARCH_PROVIDERS: Record<SearchProviderType, { name: string; url: string; keyPlaceholder: string }> = {
  exa: { name: 'Exa AI', url: 'https://exa.ai', keyPlaceholder: 'exa-...' },
  linkup: { name: 'Linkup', url: 'https://linkup.ai', keyPlaceholder: 'linkup-...' },
  tavily: { name: 'Tavily', url: 'https://tavily.com', keyPlaceholder: 'tvly-...' },
  firecrawl: { name: 'Firecrawl', url: 'https://firecrawl.dev', keyPlaceholder: 'fc-...' },
  perplexity: { name: 'Perplexity Sonar', url: 'https://perplexity.ai', keyPlaceholder: 'pplx-...' },
}

function App() {
  const [apiKey, setApiKey] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [model, setModel] = useState('')
  const [searchProvider, setSearchProvider] = useState<SearchProviderType>('exa')
  const [exaApiKey, setExaApiKey] = useState('')
  const [linkupApiKey, setLinkupApiKey] = useState('')
  const [tavilyApiKey, setTavilyApiKey] = useState('')
  const [firecrawlApiKey, setFirecrawlApiKey] = useState('')
  const [perplexityApiKey, setPerplexityApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load saved settings
    chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
      const settings = result[STORAGE_KEYS.SETTINGS] as Settings | undefined
      if (settings) {
        setApiKey(settings.apiKey || '')
        setBaseURL(settings.baseURL || '')
        setModel(settings.model || '')
        setSearchProvider(settings.searchProvider || 'exa')
        setExaApiKey(settings.exaApiKey || '')
        setLinkupApiKey(settings.linkupApiKey || '')
        setTavilyApiKey(settings.tavilyApiKey || '')
        setFirecrawlApiKey(settings.firecrawlApiKey || '')
        setPerplexityApiKey(settings.perplexityApiKey || '')
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    const settings: Settings = {
      apiKey,
      baseURL,
      model,
      searchProvider,
      exaApiKey,
      linkupApiKey,
      tavilyApiKey,
      firecrawlApiKey,
      perplexityApiKey,
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const applyPreset = (preset: keyof typeof PROVIDER_PRESETS) => {
    const config = PROVIDER_PRESETS[preset]
    setBaseURL(config.baseURL)
    setModel(config.model)
  }

  const currentSearchProvider = SEARCH_PROVIDERS[searchProvider]

  const getCurrentApiKey = (): string => {
    switch (searchProvider) {
      case 'exa':
        return exaApiKey
      case 'linkup':
        return linkupApiKey
      case 'tavily':
        return tavilyApiKey
      case 'firecrawl':
        return firecrawlApiKey
      case 'perplexity':
        return perplexityApiKey
      default:
        return exaApiKey
    }
  }

  const setCurrentApiKey = (value: string) => {
    switch (searchProvider) {
      case 'exa':
        setExaApiKey(value)
        break
      case 'linkup':
        setLinkupApiKey(value)
        break
      case 'tavily':
        setTavilyApiKey(value)
        break
      case 'firecrawl':
        setFirecrawlApiKey(value)
        break
      case 'perplexity':
        setPerplexityApiKey(value)
        break
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-primary p-8 flex items-center justify-center">
        <div className="text-content-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-primary p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gradient mb-8">
          Skillmaxing.ai Settings
        </h1>

        <div className="bg-surface-secondary border border-[rgba(255,255,255,0.1)] rounded-lg-lg shadow-elevated p-6 space-y-6">
          {/* Provider Presets */}
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-2">
              AI Provider Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PROVIDER_PRESETS).map((preset) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset as keyof typeof PROVIDER_PRESETS)}
                  className="px-4 py-2 bg-surface-tertiary hover:bg-surface-hover border border-[rgba(255,255,255,0.1)] rounded-md text-sm font-medium text-content-secondary hover:text-content-primary transition-all duration-fast"
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Base URL */}
          <div>
            <label htmlFor="baseURL" className="block text-sm font-medium text-content-secondary mb-2">
              Base URL
            </label>
            <input
              type="url"
              id="baseURL"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-4 py-2 bg-surface-tertiary border border-[rgba(255,255,255,0.1)] rounded-md text-content-primary placeholder:text-content-tertiary focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-fast"
            />
            <p className="mt-1 text-sm text-content-tertiary">
              The API endpoint URL for your AI provider
            </p>
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-content-secondary mb-2">
              AI API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2 bg-surface-tertiary border border-[rgba(255,255,255,0.1)] rounded-md text-content-primary placeholder:text-content-tertiary focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-fast"
            />
            <p className="mt-1 text-sm text-content-tertiary">
              Your AI provider API key (stored locally in your browser)
            </p>
          </div>

          {/* Model */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-content-secondary mb-2">
              Model
            </label>
            <input
              type="text"
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full px-4 py-2 bg-surface-tertiary border border-[rgba(255,255,255,0.1)] rounded-md text-content-primary placeholder:text-content-tertiary focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-fast"
            />
            <p className="mt-1 text-sm text-content-tertiary">
              The model name (e.g., gpt-4o-mini, claude-3-haiku, etc.)
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-[rgba(255,255,255,0.1)] pt-6">
            <h2 className="text-lg font-semibold text-content-primary mb-4">
              Web Search Provider
            </h2>
            <p className="text-sm text-content-secondary mb-4">
              Choose a web search provider for additional context when explaining terms. Each provider has different pricing and capabilities. You can configure keys for multiple providers and switch between them.
            </p>
          </div>

          {/* Search Provider Selection */}
          <div>
            <label htmlFor="searchProvider" className="block text-sm font-medium text-content-secondary mb-2">
              Search Provider
            </label>
            <select
              id="searchProvider"
              value={searchProvider}
              onChange={(e) => setSearchProvider(e.target.value as SearchProviderType)}
              className="w-full px-4 py-2 bg-surface-tertiary border border-[rgba(255,255,255,0.1)] rounded-md text-content-primary focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-fast"
            >
              {Object.entries(SEARCH_PROVIDERS).map(([key, provider]) => (
                <option key={key} value={key}>
                  {provider.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-content-tertiary">
              <a
                href={currentSearchProvider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:text-brand-light underline"
              >
                Learn more about {currentSearchProvider.name}
              </a>
            </p>
          </div>

          {/* Current Provider API Key */}
          <div>
            <label htmlFor="currentProviderApiKey" className="block text-sm font-medium text-content-secondary mb-2">
              {currentSearchProvider.name} API Key
            </label>
            <input
              type="password"
              id="currentProviderApiKey"
              value={getCurrentApiKey()}
              onChange={(e) => setCurrentApiKey(e.target.value)}
              placeholder={currentSearchProvider.keyPlaceholder}
              className="w-full px-4 py-2 bg-surface-tertiary border border-[rgba(255,255,255,0.1)] rounded-md text-content-primary placeholder:text-content-tertiary focus:ring-2 focus:ring-brand focus:border-brand transition-all duration-fast"
            />
            <p className="mt-1 text-sm text-content-tertiary">
              Your {currentSearchProvider.name} API key for web search. You can configure multiple providers and switch between them anytime.
            </p>
          </div>

          {/* All Configured Keys Summary */}
          {(exaApiKey || linkupApiKey || tavilyApiKey || firecrawlApiKey || perplexityApiKey) && (
            <div className="bg-surface-tertiary border border-[rgba(255,255,255,0.05)] rounded-lg p-4">
              <h3 className="text-sm font-medium text-content-secondary mb-2">
                Configured API Keys
              </h3>
              <div className="space-y-1">
                {exaApiKey && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-content-tertiary">Exa AI</span>
                    <span className="text-brand">{exaApiKey === searchProvider ? 'Active' : 'Saved'}</span>
                  </div>
                )}
                {linkupApiKey && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-content-tertiary">Linkup</span>
                    <span className="text-brand">{linkupApiKey === searchProvider ? 'Active' : 'Saved'}</span>
                  </div>
                )}
                {tavilyApiKey && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-content-tertiary">Tavily</span>
                    <span className="text-brand">{tavilyApiKey === searchProvider ? 'Active' : 'Saved'}</span>
                  </div>
                )}
                {firecrawlApiKey && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-content-tertiary">Firecrawl</span>
                    <span className="text-brand">{firecrawlApiKey === searchProvider ? 'Active' : 'Saved'}</span>
                  </div>
                )}
                {perplexityApiKey && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-content-tertiary">Perplexity</span>
                    <span className="text-brand">{perplexityApiKey === searchProvider ? 'Active' : 'Saved'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              className="w-full py-3 px-4 bg-brand hover:bg-brand-dark text-white font-medium rounded-md hover:shadow-glow transition-all duration-normal"
            >
              Save Settings
            </button>

            {saved && (
              <p className="mt-2 text-sm text-brand-light text-center">
                Settings saved successfully!
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 text-sm text-content-tertiary">
          <p>
            Your settings are stored locally in your browser using Chrome's storage API.
            They are never sent to any server other than your configured AI provider.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
