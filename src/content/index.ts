import { isProbablyReaderable, Readability } from '@mozilla/readability'
import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'
import type { ExtensionMessage, PageContent } from '../shared/types'
import { MESSAGE_TYPES } from '../shared/constants'

// Configure Turndown for optimal LLM consumption
const turndownService = new TurndownService({
  headingStyle: 'atx',      // # Heading
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced', // ```code```
  emDelimiter: '_',
  strongDelimiter: '**'
})

// Enable GitHub Flavored Markdown (tables, task lists, strikethrough)
turndownService.use(gfm)

// Remove non-content elements from conversion
turndownService.remove([
  'script', 'style', 'noscript',
  'header', 'footer', 'nav', 'aside',
  'iframe', 'canvas',
  'form', 'button', 'dialog'
])

// Custom rule: Filter out base64 images (bloat without semantic value)
turndownService.addRule('ignoreBase64Images', {
  filter: (node) => {
    if (node.nodeName === 'IMG') {
      const src = node.getAttribute('src') || ''
      return src.startsWith('data:image')
    }
    return false
  },
  replacement: () => ''
})

// Known boilerplate selectors to remove before Readability
const BAD_SELECTORS = [
  '.infobox',        // Wikipedia infoboxes
  '.mw-editsection', // Wikipedia edit links
  '.navbox',         // Navigation boxes
  '.metadata',       // Metadata sections
  '.reflist',        // Reference lists
  '.reference',      // Reference markers
  '.mw-empty-elt',   // Empty elements
  '.advertisement',  // Ads
  '.social-share',   // Social buttons
  '.comment-section' // Comments
]

console.log('[Skillmaxing:ContentScript] Loaded at', window.location.href)

chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender,
  sendResponse
) => {
  if (message.type === MESSAGE_TYPES.GET_PAGE_CONTENT) {
    const timestamp = Date.now()
    const logPrefix = `[Skillmaxing:ContentScript:${timestamp}]`
    const url = window.location.href

    console.log(`${logPrefix} Received extraction request`, {
      url,
      documentReady: document.readyState,
      hasBody: !!document.body,
      timestamp: new Date().toISOString()
    })

    try {
      const result = extractPageContent()
      const duration = Date.now() - timestamp

      if (result) {
        console.log(`${logPrefix} Extraction complete (${duration}ms)`, {
          url,
          method: result.extractionMethod,
          usedFallback: result.usedFallback,
          contentFormat: result.contentFormat,
          contentLength: result.contentLength,
          hasMetadata: !!(result.author || result.date)
        })
        sendResponse(result)
      } else {
        console.error(`${logPrefix} All extraction strategies failed`)
        sendResponse(null)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`${logPrefix} Fatal error:`, errorMsg)
      sendResponse(null)
    }

    return true // Async response
  }

  return false
})

function extractPageContent(): PageContent | null {
  const url = window.location.href
  const startTime = Date.now()

  let extractionMethod = 'readability'
  let usedFallback = false
  let htmlToConvert = ''
  let article: ReturnType<Readability['parse']> = null

  // === STEP 1: Clone and pre-clean DOM ===
  const documentClone = document.cloneNode(true) as Document

  // Remove known boilerplate elements
  BAD_SELECTORS.forEach(selector => {
    documentClone.querySelectorAll(selector).forEach(el => el.remove())
  })

  // === STEP 2: Try Readability with HTML output ===
  try {
    if (isProbablyReaderable(documentClone)) {
      console.log('[Skillmaxing:Content] Readability check passed')
      const reader = new Readability(documentClone)
      article = reader.parse()

      if (article?.content && article.content.length > 100) {
        htmlToConvert = article.content
        console.log('[Skillmaxing:Content] Readability succeeded', {
          title: article.title,
          hasByline: !!article.byline,
          hasDate: !!article.publishedTime,
          contentLength: article.content.length
        })
      } else {
        console.log('[Skillmaxing:Content] Readability returned insufficient content')
      }
    } else {
      console.log('[Skillmaxing:Content] Page not readerable, will use fallback')
    }
  } catch (error) {
    console.warn('[Skillmaxing:Content] Readability failed:', error)
  }

  // === STEP 3: Smart fallback chain ===
  if (!htmlToConvert) {
    usedFallback = true
    extractionMethod = 'semantic-fallback'

    // Try semantic containers in order of preference
    const fallbackSelectors = [
      'main',
      '[role="main"]',
      '#main-content',
      '#main',
      '#content',
      '.content',
      'article'
    ]

    let fallbackEl: Element | null = null

    for (const selector of fallbackSelectors) {
      fallbackEl = document.querySelector(selector)
      if (fallbackEl) {
        extractionMethod = `fallback:${selector}`
        console.log(`[Skillmaxing:Content] Fallback found: ${selector}`)
        break
      }
    }

    // Ultimate fallback: body
    if (!fallbackEl) {
      fallbackEl = document.body
      extractionMethod = 'fallback:body'
      console.log('[Skillmaxing:Content] Ultimate fallback: body')
    }

    htmlToConvert = fallbackEl.innerHTML
  }

  // === STEP 4: Convert HTML to Markdown ===
  let markdown = turndownService.turndown(htmlToConvert)

  // === STEP 5: Post-processing cleanup ===
  // Remove lines with only solitary dashes or middle dots (artifacts)
  markdown = markdown.replace(/^[ \t]*[-·][ \t]*$/gm, '')
  // Remove whitespace-only lines
  markdown = markdown.replace(/^[ \t]+$/gm, '')
  // Collapse 3+ newlines to 2
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim()

  // === STEP 6: Build result with metadata ===
  const duration = Date.now() - startTime

  // Use larger limit for markdown (it's more token-efficient)
  // Or remove truncation entirely - research suggests full content is better
  const MAX_CONTENT_LENGTH = 12000  // Increased from 4000
  const originalLength = markdown.length
  const truncated = markdown.length > MAX_CONTENT_LENGTH

  if (truncated) {
    markdown = markdown.slice(0, MAX_CONTENT_LENGTH) +
               '\n\n[Content truncated...]'
  }

  return {
    title: article?.title || document.title || '',
    content: markdown,
    contentFormat: 'markdown',

    // Metadata from Readability (only available if Readability succeeded)
    author: article?.byline || undefined,
    date: article?.publishedTime || undefined,
    excerpt: article?.excerpt || undefined,
    siteName: article?.siteName || undefined,
    lang: article?.lang || undefined,

    url,
    extractionMethod,
    usedFallback,
    duration,
    contentLength: originalLength
  }
}
