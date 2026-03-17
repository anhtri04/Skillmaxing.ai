import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { MESSAGE_TYPES, STORAGE_KEYS, SYSTEM_PROMPT } from '../shared/constants'
import type { PageContent, Settings } from '../shared/types'

console.log('Skillmaxing.ai background script loaded')

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explain-term",
    title: "Explain with Skillmaxing",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "explain-term" && tab?.id && info.selectionText) {
    const tabId = tab.id;
    const term = info.selectionText;
    console.log('Context menu clicked, tab ID:', tabId);
    
    // Open side panel IMMEDIATELY (synchronously within user gesture)
    chrome.sidePanel.open({ tabId }).then(() => {
      console.log('Side panel opened');
      
      // Now do the async work
      handleExplainTerm(tabId, term);
    }).catch((error) => {
      console.error('Error opening side panel:', error);
    });
  }
});

async function handleExplainTerm(tabId: number, term: string) {
  try {
    // Get page content
    const pageContent = await getPageContentWithRetry(tabId, 3);
    console.log('Page content retrieved:', pageContent ? 'success' : 'failed');
    
    // Send message to side panel with term and page content
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.EXPLAIN_TERM,
        term: term,
        pageTitle: pageContent?.title || null,
        pageContent: pageContent?.content || null,
      });
      console.log('Message sent to side panel');
    }, 500);
  } catch (error) {
    console.error('Error in handleExplainTerm:', error);
    // Fallback: send just the term
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.EXPLAIN_TERM,
        term: term,
        pageTitle: null,
        pageContent: null,
      });
    }, 500);
  }
}

// Handle streaming connections from side panel
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'skillmaxing-stream') {
    console.log('Stream connection established');
    
    port.onMessage.addListener(async (message) => {
      if (message.type === 'START_STREAM') {
        const { messages, term, pageTitle, pageContent } = message;
        
        try {
          // Get settings
          const settings = await getSettings();
          
          if (!settings.apiKey) {
            port.postMessage({
              type: MESSAGE_TYPES.STREAM_ERROR,
              error: 'No API key configured. Please set up your API key in the extension options.',
            });
            return;
          }
          
          // Build system message with context
          const systemMessage = buildSystemMessage(term, pageTitle, pageContent);
          
          // Create OpenAI client with custom baseURL
          const openai = createOpenAI({
            apiKey: settings.apiKey,
            baseURL: settings.baseURL || undefined,
          });
          
          // Stream the response
          const result = await streamText({
            model: openai(settings.model || 'gpt-4o-mini'),
            system: systemMessage,
            messages: messages,
          });
          
          // Forward each chunk
          for await (const chunk of result.textStream) {
            port.postMessage({
              type: MESSAGE_TYPES.STREAM_CHUNK,
              chunk,
            });
          }
          
          // Signal completion
          port.postMessage({
            type: MESSAGE_TYPES.STREAM_DONE,
          });
          
        } catch (error) {
          console.error('Stream error:', error);
          let errorMessage = 'Unknown error occurred';
          if (error instanceof Error) {
            errorMessage = error.message;
            if (errorMessage.includes('401')) {
              errorMessage = 'Invalid API key. Please check your settings and ensure the API key is correct.';
            } else if (errorMessage.includes('404')) {
              errorMessage = `Model not found or invalid endpoint. Check your Base URL and Model settings.`;
            } else if (errorMessage.includes('429')) {
              errorMessage = 'Rate limit exceeded. Please try again later.';
            }
          }
          port.postMessage({
            type: MESSAGE_TYPES.STREAM_ERROR,
            error: errorMessage,
          });
        }
      }
    });
    
    port.onDisconnect.addListener(() => {
      console.log('Stream connection closed');
    });
  }
});

async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
      const settings = result[STORAGE_KEYS.SETTINGS] as Settings | undefined;
      if (settings) {
        resolve(settings);
      } else {
        resolve({
          apiKey: '',
          baseURL: '',
          model: '',
        });
      }
    });
  });
}

function buildSystemMessage(term: string, pageTitle?: string | null, pageContent?: string | null): string {
  let context = SYSTEM_PROMPT;
  
  if (pageTitle) {
    context += `\n\nThe user is reading an article titled: "${pageTitle}"`;
  }
  
  if (pageContent) {
    context += `\n\nArticle context:\n${pageContent.slice(0, 3000)}`;
  }
  
  context += `\n\nExplain the term "${term}" in the context of this article.`;
  
  return context;
}

async function getPageContentWithRetry(tabId: number, retries: number): Promise<PageContent | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const content = await getPageContent(tabId);
      if (content) return content;
      
      if (i < retries - 1) {
        console.log(`Retry ${i + 1}/${retries} getting page content...`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
    }
  }
  return null;
}

async function getPageContent(tabId: number): Promise<PageContent | null> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: MESSAGE_TYPES.GET_PAGE_CONTENT },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log('Content script not ready yet:', chrome.runtime.lastError.message);
          resolve(null);
        } else {
          resolve(response as PageContent);
        }
      }
    );
  });
}
