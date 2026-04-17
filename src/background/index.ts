import { streamText, zodSchema, stepCountIs } from 'ai'
import { z } from 'zod'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { MESSAGE_TYPES, STORAGE_KEYS, SYSTEM_PROMPT } from '../shared/constants'
import type { PageContent, Settings } from '../shared/types'
import { getSearchApiKey } from '../shared/types'
import { getSearchProvider } from './search-providers'

// Detect API provider from baseURL
function detectApiProvider(baseURL: string): 'groq' | 'openai' | 'other' {
  if (baseURL.includes('groq')) {
    return 'groq'
  }
  if (baseURL.includes('openai')) {
    return 'openai'
  }
  return 'other'
}

// Clean messages based on API provider requirements
function cleanMessagesForProvider(
  messages: Array<{ role: string; content: unknown; [key: string]: unknown }>
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.map((m) => {
    const contentStr = typeof m.content === 'string' ? m.content : String(m.content);
    
    // Create a new object with ONLY role and content
    // This removes ANY extra properties including reasoning_content, id, etc.
    const cleaned: { role: 'user' | 'assistant'; content: string } = {
      role: m.role as 'user' | 'assistant',
      content: contentStr,
    };

    return cleaned;
  });
}

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
    const tabUrl = tab.url || 'unknown';
    
    console.log('[Skillmaxing:Menu]', {
      event: 'Context menu clicked',
      tabId,
      url: tabUrl,
      selectedTerm: term.substring(0, 50) + (term.length > 50 ? '...' : ''),
      timestamp: new Date().toISOString()
    });
    
    // Open side panel IMMEDIATELY (synchronously within user gesture)
    chrome.sidePanel.open({ tabId }).then(() => {
      console.log('[Skillmaxing:Menu] Side panel opened successfully');
      
      // Now do the async work
      handleExplainTerm(tabId, term, tabUrl);
    }).catch((error) => {
      console.error('[Skillmaxing:Menu] Error opening side panel:', error);
    });
  }
});

async function handleExplainTerm(tabId: number, term: string, tabUrl: string) {
  const startTime = Date.now();
  
  console.log('[Skillmaxing:Flow] Starting explain term flow', {
    tabId,
    url: tabUrl,
    term: term.substring(0, 50) + (term.length > 50 ? '...' : '')
  });
  
  try {
    // Get page content
    const pageContent = await getPageContentWithRetry(tabId, tabUrl, 3);
    const duration = Date.now() - startTime;
    
    console.log('[Skillmaxing:Flow] Content extraction result', {
      tabId,
      url: tabUrl,
      success: !!pageContent,
      hasTitle: !!pageContent?.title,
      hasContent: !!pageContent?.content,
      contentLength: pageContent?.content?.length || 0,
      title: pageContent?.title?.substring(0, 50) || 'N/A',
      duration: `${duration}ms`
    });
    
    // Send message to side panel with term and page content
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.EXPLAIN_TERM,
        term: term,
        pageTitle: pageContent?.title || null,
        pageContent: pageContent?.content || null,
        pageUrl: tabUrl,
      });
      console.log('[Skillmaxing:Flow] Message sent to side panel');
    }, 500);
  } catch (error) {
    console.error('[Skillmaxing:Flow] Error in handleExplainTerm:', error);
    // Fallback: send just the term
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.EXPLAIN_TERM,
        term: term,
        pageTitle: null,
        pageContent: null,
        pageUrl: tabUrl,
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
          
          // Detect API provider
          const baseURL = settings.baseURL || 'https://api.openai.com/v1';
          const provider = detectApiProvider(baseURL);
          console.log('[Skillmaxing:Stream] Detected API provider:', provider, 'baseURL:', baseURL);
          
          // Create OpenAI-compatible client for Groq/custom endpoints
          const openai = createOpenAICompatible({
            name: 'custom-provider',
            apiKey: settings.apiKey,
            baseURL: baseURL,
          });
          
          // Map messages to CoreMessage format, filtering out empty messages and unsupported properties
          const cleanedMessages = cleanMessagesForProvider(
            messages.filter((m: { role: string; content: unknown }) => {
              const contentStr = typeof m.content === 'string' ? m.content : String(m.content);
              return contentStr.trim() !== '';
            })
          );
          
          // Build messages based on provider requirements
          let coreMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
          
          if (provider === 'groq') {
            // Groq reasoning models don't support system prompts
            // Merge system message into first user message
            if (cleanedMessages.length > 0 && cleanedMessages[0].role === 'user') {
              const firstUserMsg = cleanedMessages[0];
              coreMessages = [
                {
                  role: 'user',
                  content: `${systemMessage}\n\n${firstUserMsg.content}`,
                },
                ...cleanedMessages.slice(1),
              ];
            } else {
              // No user message yet, add system as first user message
              coreMessages = [
                { role: 'user', content: systemMessage },
                ...cleanedMessages,
              ];
            }
          } else {
            // Standard behavior for OpenAI and other providers
            coreMessages = [
              { role: 'system' as const, content: systemMessage },
              ...cleanedMessages,
            ];
          }

          console.log('[Skillmaxing:Stream] Starting stream with web_search tool');
          console.log('[Skillmaxing:Stream] Raw messages received from side panel:', JSON.stringify(messages, null, 2));
          
          // Inspect message properties before cleaning
          console.log('[Skillmaxing:Stream] Inspecting message properties:');
          messages.forEach((m: any, i: number) => {
            console.log(`  Message ${i}:`, {
              role: m.role,
              contentLength: m.content?.length,
              hasReasoningContent: 'reasoning_content' in m,
              allKeys: Object.keys(m),
            });
          });
          
          console.log('[Skillmaxing:Stream] Messages for API:', JSON.stringify(coreMessages, null, 2));
          console.log('[Skillmaxing:Stream] CoreMessages structure:');
          coreMessages.forEach((m: any, i: number) => {
            console.log(`  CoreMessage ${i}:`, {
              role: m.role,
              contentLength: m.content?.length,
              hasReasoningContent: 'reasoning_content' in m,
              allKeys: Object.keys(m),
            });
          });
          
          // Stream with tools - define inline
          const result = await streamText({
            model: openai(settings.model || 'gpt-4o-mini'),
            messages: coreMessages,
            tools: {
              web_search: {
                description: 'Search the web for additional context about the term. Use this tool to find relevant information before explaining. Returns search results with title, URL, and highlights.',
                inputSchema: zodSchema(z.object({
                  query: z.string().describe('The search query to find information about'),
                })),
                execute: async ({ query }: { query: string }) => {
                  console.log('[Skillmaxing:Tool] web_search tool called with query:', query);
                  
                  const searchApiKey = getSearchApiKey(settings);
                  if (!searchApiKey) {
                    console.log('[Skillmaxing:Tool] Search API key not configured, returning error');
                    return { results: [], error: 'Search API key not configured' };
                  }
                  
                  try {
                    console.log('[Skillmaxing:Tool] Calling search provider:', settings.searchProvider || 'exa');
                    const provider = getSearchProvider(settings.searchProvider || 'exa');
                    const results = await provider.search(query, searchApiKey, 5);
                    console.log('[Skillmaxing:Tool] Search returned', results.length, 'results');
                    console.log('[Skillmaxing:Tool] First result:', results[0]);
                    return { results };
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error('[Skillmaxing:Tool] Search error:', error);
                    return { results: [], error: errorMessage };
                  }
                },
              },
            },
            toolChoice: 'auto',
            stopWhen: stepCountIs(5), // Allow multi-step: tool call + response generation
            onStepFinish: ({ stepNumber, text, toolCalls, toolResults, finishReason }) => {
              console.log(`[Skillmaxing:Stream] Step ${stepNumber} finished (${finishReason})`);
              console.log(`[Skillmaxing:Stream] Step text length: ${text?.length || 0}`);
              console.log(`[Skillmaxing:Stream] Tool calls in step:`, toolCalls?.length || 0);
              console.log(`[Skillmaxing:Stream] Tool results in step:`, toolResults?.length || 0);
            },
          });
          
          console.log('[Skillmaxing:Stream] Stream started, waiting for chunks...');
          
          let chunkCount = 0;
          // Forward each chunk
          for await (const chunk of result.textStream) {
            chunkCount++;
            if (chunkCount === 1) {
              console.log('[Skillmaxing:Stream] First chunk received');
            }
            if (chunkCount % 10 === 0) {
              console.log(`[Skillmaxing:Stream] Received ${chunkCount} chunks so far`);
            }
            port.postMessage({
              type: MESSAGE_TYPES.STREAM_CHUNK,
              chunk,
            });
          }
          
          console.log(`[Skillmaxing:Stream] Stream complete. Total chunks: ${chunkCount}`);
          
          // Log final response for debugging
          const finalText = await result.text;
          console.log(`[Skillmaxing:Stream] Final response length: ${finalText.length}`);
          
          // Signal completion
          port.postMessage({
            type: MESSAGE_TYPES.STREAM_DONE,
          });
          
        } catch (error) {
          console.error('Stream error:', error);
          console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

          let errorMessage = 'Unknown error occurred';
          if (error instanceof Error) {
            errorMessage = error.message;
            // Log additional error properties if available
            const errorAny = error as Error & { 
              statusCode?: number; 
              response?: unknown; 
              cause?: unknown;
              error?: unknown;
            };
            if (errorAny.statusCode) console.error('Error statusCode:', errorAny.statusCode);
            if (errorAny.response) {
              console.error('Error response:', JSON.stringify(errorAny.response, null, 2));
            }
            if (errorAny.cause) {
              console.error('Error cause:', JSON.stringify(errorAny.cause, null, 2));
            }
            if (errorAny.error) {
              console.error('Error.error:', JSON.stringify(errorAny.error, null, 2));
            }

            // Specific error handling for Groq API
            if (errorMessage.includes('reasoning_content') && errorMessage.includes('unsupported')) {
              errorMessage = 'API Error: This model or provider does not support reasoning_content in messages. Try a different model or API provider.';
            } else if (errorMessage.includes('401')) {
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
      const settings = result[STORAGE_KEYS.SETTINGS] as Settings | undefined
      if (settings) {
        resolve(settings)
      } else {
        resolve({
          apiKey: '',
          baseURL: '',
          model: '',
          searchProvider: 'exa',
          exaApiKey: '',
          linkupApiKey: '',
          tavilyApiKey: '',
          firecrawlApiKey: '',
          perplexityApiKey: '',
        })
      }
    })
  })
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

async function getPageContentWithRetry(tabId: number, tabUrl: string, retries: number): Promise<PageContent | null> {
  console.log(`[Skillmaxing:Retry] Starting content extraction with ${retries} max retries`, {
    tabId,
    url: tabUrl
  });
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Skillmaxing:Retry] Attempt ${i + 1}/${retries}`, { tabId, url: tabUrl });
      const content = await getPageContent(tabId, tabUrl);
      
      if (content) {
        console.log(`[Skillmaxing:Retry] Success on attempt ${i + 1}`, {
          tabId,
          url: tabUrl,
          attempts: i + 1
        });
        return content;
      }
      
      if (i < retries - 1) {
        console.log(`[Skillmaxing:Retry] Attempt ${i + 1} failed, waiting 200ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`[Skillmaxing:Retry] Attempt ${i + 1} threw error:`, error);
    }
  }
  
  console.error(`[Skillmaxing:Retry] All ${retries} attempts failed`, { tabId, url: tabUrl });
  return null;
}

async function getPageContent(tabId: number, tabUrl: string): Promise<PageContent | null> {
  const timestamp = Date.now();
  const logPrefix = `[Skillmaxing:Content:${timestamp}]`;
  
  console.log(`${logPrefix} Starting content extraction request`, {
    tabId,
    url: tabUrl,
    timestamp: new Date().toISOString()
  });

  return new Promise((resolve) => {
    // Set timeout to catch unresponsive content scripts
    const timeout = setTimeout(() => {
      console.warn(`${logPrefix} TIMEOUT - Content script did not respond within 5s`, {
        tabId,
        url: tabUrl,
        possibleReasons: [
          'Content script not injected yet',
          'Page is chrome:// URL or restricted',
          'Content script crashed',
          'Extension was just reloaded',
          'SPA navigation (React/Vue) without page reload'
        ]
      });
      resolve(null);
    }, 5000);

    chrome.tabs.sendMessage(
      tabId,
      { type: MESSAGE_TYPES.GET_PAGE_CONTENT },
      (response) => {
        clearTimeout(timeout);
        const duration = Date.now() - timestamp;
        
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message;
          let reason = 'Unknown';
          
          if (errorMsg && errorMsg.includes('Could not establish connection')) {
            reason = 'Content script not injected or not responding';
          } else if (errorMsg && errorMsg.includes('Receiving end does not exist')) {
            reason = 'Content script not loaded on this page';
          } else if (tabUrl?.startsWith('chrome://')) {
            reason = 'Chrome internal pages block content scripts';
          } else if (tabUrl?.startsWith('file://')) {
            reason = 'Local file access may be restricted';
          }
          
          console.error(`${logPrefix} Content script error (${duration}ms):`, {
            error: errorMsg,
            reason,
            tabId,
            url: tabUrl,
            duration: `${duration}ms`
          });
          resolve(null);
          
        } else if (!response) {
          console.warn(`${logPrefix} No response from content script (${duration}ms):`, {
            tabId,
            url: tabUrl,
            note: 'Content script may be present but returned null/undefined',
            duration: `${duration}ms`
          });
          resolve(null);
          
        } else {
          console.log(`${logPrefix} Content received successfully (${duration}ms):`, {
            tabId,
            url: tabUrl,
            hasTitle: !!response.title,
            title: response.title?.substring(0, 50) + (response.title?.length > 50 ? '...' : ''),
            contentLength: response.content?.length || 0,
            extractionMethod: response.extractionMethod || 'readability',
            usedFallback: response.usedFallback || false,
            duration: `${duration}ms`
          });
          resolve(response as PageContent);
        }
      }
    );
  });
}
