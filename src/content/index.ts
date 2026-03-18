import { Readability } from '@mozilla/readability'
import type { ExtensionMessage } from '../shared/types'
import { MESSAGE_TYPES } from '../shared/constants'

console.log('[Skillmaxing:ContentScript] Loaded at', window.location.href)

chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender,
  sendResponse
) => {
  if (message.type === MESSAGE_TYPES.GET_PAGE_CONTENT) {
    const timestamp = Date.now();
    const logPrefix = `[Skillmaxing:ContentScript:${timestamp}]`;
    const url = window.location.href;
    
    console.log(`${logPrefix} Received extraction request`, {
      url,
      documentReady: document.readyState,
      hasBody: !!document.body,
      timestamp: new Date().toISOString()
    });

    try {
      let extractionMethod = 'readability';
      let usedFallback = false;
      let result: { title: string; content: string } | null = null;
      let error: Error | null = null;
      
      // Strategy 1: Readability
      try {
        console.log(`${logPrefix} Attempting Readability extraction...`);
        const documentClone = document.cloneNode(true) as Document;
        const reader = new Readability(documentClone);
        const article = reader.parse();
        
        if (article && article.textContent && article.textContent.length > 100) {
          result = {
            title: article.title || document.title,
            content: article.textContent.slice(0, 4000)
          };
          console.log(`${logPrefix} Readability succeeded`, {
            titleLength: article.title?.length,
            contentLength: article.textContent.length,
            truncated: article.textContent.length > 4000
          });
        } else {
          console.log(`${logPrefix} Readability returned insufficient content, will try fallback`);
        }
      } catch (readabilityError) {
        error = readabilityError instanceof Error ? readabilityError : new Error(String(readabilityError));
        console.warn(`${logPrefix} Readability failed:`, error.message);
      }
      
      // Strategy 2: Fallback to body innerText
      if (!result) {
        try {
          console.log(`${logPrefix} Attempting body.innerText fallback...`);
          const bodyText = document.body?.innerText || '';
          
          if (bodyText.length > 100) {
            result = {
              title: document.title,
              content: bodyText.slice(0, 4000)
            };
            extractionMethod = 'body-innerText';
            usedFallback = true;
            console.log(`${logPrefix} Fallback succeeded`, {
              contentLength: bodyText.length,
              truncated: bodyText.length > 4000
            });
          } else {
            console.warn(`${logPrefix} Body text too short: ${bodyText.length} chars`);
          }
        } catch (fallbackError) {
          const fallbackErr = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
          console.error(`${logPrefix} Fallback also failed:`, fallbackErr.message);
        }
      }
      
      const duration = Date.now() - timestamp;
      
      if (result) {
        console.log(`${logPrefix} Extraction complete (${duration}ms)`, {
          url,
          method: extractionMethod,
          usedFallback,
          title: result.title?.substring(0, 50) + (result.title?.length > 50 ? '...' : ''),
          contentLength: result.content.length,
          duration: `${duration}ms`
        });
        
        sendResponse({
          title: result.title,
          content: result.content,
          url: url,
          extractionMethod,
          usedFallback,
          duration
        });
      } else {
        console.error(`${logPrefix} All extraction strategies failed (${duration}ms)`, {
          url,
          readabilityError: error?.message,
          documentState: {
            readyState: document.readyState,
            hasBody: !!document.body,
            bodyLength: document.body?.innerText?.length || 0
          }
        });
        
        // Send null to indicate complete failure
        sendResponse(null);
      }
      
    } catch (error) {
      const duration = Date.now() - timestamp;
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`${logPrefix} Fatal error during extraction (${duration}ms):`, {
        error: errorMsg,
        url,
        stack: error instanceof Error ? error.stack : undefined
      });
      sendResponse(null);
    }
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
  
  return false;
})
