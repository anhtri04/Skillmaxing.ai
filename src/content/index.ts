import { Readability } from '@mozilla/readability'
import type { ExtensionMessage } from '../shared/types'
import { MESSAGE_TYPES } from '../shared/constants'

console.log('Skillmaxing.ai content script loaded')

chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender,
  sendResponse
) => {
  if (message.type === MESSAGE_TYPES.GET_PAGE_CONTENT) {
    try {
      // Clone document to avoid modifying the actual page
      const documentClone = document.cloneNode(true) as Document
      const reader = new Readability(documentClone)
      const article = reader.parse()
      
      if (article) {
        // Truncate content to 4000 characters as per AGENTS.md
        const truncatedContent = (article.textContent || '').slice(0, 4000)
        
        sendResponse({
          title: article.title,
          content: truncatedContent,
          url: window.location.href,
        })
      } else {
        // Fallback: use body innerText if Readability fails
        const fallbackContent = document.body.innerText.slice(0, 4000)
        sendResponse({
          title: document.title,
          content: fallbackContent,
          url: window.location.href,
        })
      }
    } catch (error) {
      console.error('Error extracting page content:', error)
      // Fallback on error
      const fallbackContent = document.body.innerText.slice(0, 4000)
      sendResponse({
        title: document.title,
        content: fallbackContent,
        url: window.location.href,
      })
    }
    
    // Return true to indicate we'll respond asynchronously
    return true
  }
  
  return false
})
