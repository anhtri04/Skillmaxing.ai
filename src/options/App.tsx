import { useState, useEffect } from 'react'
import { STORAGE_KEYS } from '../shared/constants'
import type { Settings } from '../shared/types'

const PROVIDER_PRESETS = {
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  groq: { baseURL: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant' },
  openrouter: { baseURL: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  ollama: { baseURL: 'http://localhost:11434/api', model: 'llama3.2' },
}

function App() {
  const [apiKey, setApiKey] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [model, setModel] = useState('')
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
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    const settings: Settings = {
      apiKey,
      baseURL,
      model,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-600 mb-8">
          Skillmaxing.ai Settings
        </h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Provider Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provider Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PROVIDER_PRESETS).map((preset) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset as keyof typeof PROVIDER_PRESETS)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 transition-colors"
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Base URL */}
          <div>
            <label htmlFor="baseURL" className="block text-sm font-medium text-gray-700 mb-2">
              Base URL
            </label>
            <input
              type="url"
              id="baseURL"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              The API endpoint URL for your provider
            </p>
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              Your API key (stored locally in your browser)
            </p>
          </div>

          {/* Model */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <input
              type="text"
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o-mini"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              The model name (e.g., gpt-4o-mini, claude-3-haiku, etc.)
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Save Settings
            </button>
            
            {saved && (
              <p className="mt-2 text-sm text-green-600 text-center">
                Settings saved successfully!
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
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
