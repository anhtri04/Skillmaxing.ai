import { useState, useEffect } from 'react'
import { MESSAGE_TYPES } from '../shared/constants'
import type { ExtensionMessage } from '../shared/types'

function App() {
  const [pendingTerm, setPendingTerm] = useState<string | null>(null)
  const [pageTitle, setPageTitle] = useState<string | null>(null)
  const [pageContent, setPageContent] = useState<string | null>(null)

  useEffect(() => {
    const handler = (msg: ExtensionMessage) => {
      if (msg.type === MESSAGE_TYPES.EXPLAIN_TERM) {
        setPendingTerm(msg.term || null)
        setPageTitle(msg.pageTitle || null)
        setPageContent(msg.pageContent || null)
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-blue-600 mb-4">
          Skillmaxing.ai
        </h1>
        
        {pendingTerm ? (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Selected Term:
              </h2>
              <p className="text-2xl font-bold text-blue-600">
                "{pendingTerm}"
              </p>
            </div>
            
            {pageTitle && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-semibold text-gray-500 mb-1">
                  From page:
                </h3>
                <p className="text-gray-800 font-medium">{pageTitle}</p>
              </div>
            )}
            
            {pageContent && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">
                  Page context (first 500 chars):
                </h3>
                <p className="text-sm text-gray-600 line-clamp-6">
                  {pageContent.slice(0, 500)}...
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-600">
            Select any text on a page, right-click, and choose "Explain with Skillmaxing" to get started.
          </p>
        )}
      </div>
    </div>
  )
}

export default App
