import { MESSAGE_TYPES } from '../shared/constants'
import type { PageContent } from '../shared/types'

console.log('Skillmaxing.ai background script loaded')

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explain-term",
    title: "Explain with Skillmaxing",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "explain-term" && tab?.id) {
    console.log('Context menu clicked, tab ID:', tab.id);
    
    try {
      // Open side panel immediately
      await chrome.sidePanel.open({ tabId: tab.id });
      console.log('Side panel opened');
      
      // Try to get page content (content script might not be ready yet)
      const pageContent = await getPageContentWithRetry(tab.id, 3);
      console.log('Page content retrieved:', pageContent ? 'success' : 'failed');
      
      // Send message to side panel with term and page content
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.EXPLAIN_TERM,
          term: info.selectionText,
          pageTitle: pageContent?.title || null,
          pageContent: pageContent?.content || null,
        });
        console.log('Message sent to side panel');
      }, 500); // Increased delay to ensure panel is mounted
    } catch (error) {
      console.error('Error in context menu click:', error);
      // Fallback: still try to send just the term
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.EXPLAIN_TERM,
          term: info.selectionText,
          pageTitle: null,
          pageContent: null,
        });
      }, 500);
    }
  }
});

async function getPageContentWithRetry(tabId: number, retries: number): Promise<PageContent | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const content = await getPageContent(tabId);
      if (content) return content;
      
      // If no content, wait and retry
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
