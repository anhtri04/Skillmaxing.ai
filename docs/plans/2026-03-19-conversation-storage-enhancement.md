# Conversation Storage Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change conversation storage from tab-scoped to URL-scoped, preserving conversations per page across tab switches and browser sessions.

**Architecture:** 
- Conversations keyed by normalized page URL instead of tab ID
- Shared across all tabs with same URL
- Tab ID retained only for messaging/Port operations
- Duplicate term detection per page to prevent re-explanation

**Tech Stack:** TypeScript, Chrome Extension APIs (storage.session, runtime.Port), React

---

## Current State Analysis

**Current storage key:** `conversation-${tabId}`
- Location: `src/sidepanel/App.tsx`
- Cleared when navigating to new page (URL check at lines 64-70)
- Lost when switching tabs or closing/reopening sidepanel

**Current flow:**
1. User selects text → "Explain with Skillmaxing"
2. Background sends message with `pageUrl` to sidepanel
3. Sidepanel checks `if (newPageUrl !== currentPageUrl)` → clears messages if different
4. Conversation stored per tab ID

---

## Required Changes

### Task 1: Add URL normalization utility

**Files:**
- Create: `src/shared/url-utils.ts`
- Test: Manual verification in sidepanel

**Step 1: Create URL normalization function**

```typescript
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove hash fragments
    urlObj.hash = '';
    // Remove common tracking params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    trackingParams.forEach(param => urlObj.searchParams.delete(param));
    return urlObj.toString();
  } catch {
    return url;
  }
}
```

**Step 2: Add constants for storage keys**

Update `src/shared/constants.ts`:
```typescript
export const STORAGE_KEYS = {
  CONVERSATIONS: 'skillmaxing-conversations',
  // New constant for the conversations map
  CONVERSATIONS_MAP: 'skillmaxing-conversations-map',
} as const;
```

**Step 3: Commit**

```bash
git add src/shared/url-utils.ts src/shared/constants.ts
git commit -m "feat: add URL normalization for conversation storage"
```

---

### Task 2: Update storage functions to use URL-based keys

**Files:**
- Modify: `src/sidepanel/App.tsx:100-133` (saveConversation, loadConversation)

**Step 1: Update saveConversation function**

Replace lines 100-110:
```typescript
const saveConversation = async (tabId: number, messages: Message[]) => {
  const data = {
    term: pendingTerm,
    messages,
    pageTitle,
    pageContent,
    timestamp: Date.now(),
  };
  await chrome.storage.session.set({
    [`conversation-${tabId}`]: data,
  });
};
```

With URL-based storage:
```typescript
const saveConversation = async (pageUrl: string, messages: Message[]) => {
  if (!pageUrl) return;
  const normalizedUrl = normalizeUrl(pageUrl);
  const data = {
    term: pendingTerm,
    messages,
    pageTitle,
    pageContent,
    timestamp: Date.now(),
  };
  // Get existing conversations map
  const result = await chrome.storage.session.get([STORAGE_KEYS.CONVERSATIONS_MAP]);
  const conversationsMap = (result[STORAGE_KEYS.CONVERSATIONS_MAP] as Record<string, typeof data>) || {};
  // Update with new conversation
  conversationsMap[normalizedUrl] = data;
  await chrome.storage.session.set({
    [STORAGE_KEYS.CONVERSATIONS_MAP]: conversationsMap,
  });
};
```

**Step 2: Update loadConversation function**

Replace lines 111-133:
```typescript
const loadConversation = async (tabId: number) => {
  const result = await chrome.storage.session.get([`conversation-${tabId}`]);
  const savedConversation = result[`conversation-${tabId}`] as
    | {
        term: string;
        messages: Message[];
        pageTitle: string | null;
        pageContent: string | null;
      }
    | undefined;

  if (savedConversation) {
    setPendingTerm(savedConversation.term);
    setMessages(savedConversation.messages);
    setPageTitle(savedConversation.pageTitle);
    setPageContent(savedConversation.pageContent);
    setHasExplained(true);
  }
};
```

With URL-based loading:
```typescript
const loadConversation = async (pageUrl: string) => {
  if (!pageUrl) return;
  const normalizedUrl = normalizeUrl(pageUrl);
  const result = await chrome.storage.session.get([STORAGE_KEYS.CONVERSATIONS_MAP]);
  const conversationsMap = (result[STORAGE_KEYS.CONVERSATIONS_MAP] as Record<string, {
    term: string;
    messages: Message[];
    pageTitle: string | null;
    pageContent: string | null;
  }>) || {};
  const savedConversation = conversationsMap[normalizedUrl];

  if (savedConversation) {
    setPendingTerm(savedConversation.term);
    setMessages(savedConversation.messages);
    setPageTitle(savedConversation.pageTitle);
    setPageContent(savedConversation.pageContent);
    setHasExplained(true);
  }
};
```

**Step 3: Update imports**

Add to imports at top of `App.tsx`:
```typescript
import { normalizeUrl } from '../shared/url-utils';
import { STORAGE_KEYS } from '../shared/constants';
```

**Step 4: Commit**

```bash
git add src/sidepanel/App.tsx
git commit -m "feat: change conversation storage to URL-based keys"
```

---

### Task 3: Update sidepanel state management

**Files:**
- Modify: `src/sidepanel/App.tsx:39-44, 46-51, 64-70` (effects and page change detection)

**Step 1: Update conversation loading effect**

Replace lines 39-44:
```typescript
useEffect(() => {
  if (currentTabId !== null) {
    loadConversation(currentTabId);
  }
}, [currentTabId]);
```

With URL-based loading:
```typescript
useEffect(() => {
  if (currentPageUrl) {
    loadConversation(currentPageUrl);
  }
}, [currentPageUrl]);
```

**Step 2: Update conversation saving effect**

Replace lines 46-51:
```typescript
useEffect(() => {
  if (currentTabId !== null && messages.length > 0) {
    saveConversation(currentTabId, messages);
  }
}, [messages, currentTabId]);
```

With URL-based saving:
```typescript
useEffect(() => {
  if (currentPageUrl && messages.length > 0) {
    saveConversation(currentPageUrl, messages);
  }
}, [messages, currentPageUrl]);
```

**Step 3: Update page change detection logic**

Replace lines 64-70 (in message handler):
```typescript
if (newPageUrl && newPageUrl !== currentPageUrl) {
  setMessages([]);
  setCurrentPageUrl(newPageUrl);
  lastExplainedTermRef.current = null;
}
```

With conversation preservation:
```typescript
if (newPageUrl && newPageUrl !== currentPageUrl) {
  // Don't clear messages - loadConversation will restore existing conversation
  // or set empty state if none exists for this URL
  setCurrentPageUrl(newPageUrl);
  lastExplainedTermRef.current = null;
  // Load conversation for new URL
  loadConversation(newPageUrl);
}
```

**Step 4: Commit**

```bash
git add src/sidepanel/App.tsx
git commit -m "feat: update sidepanel to use URL-based conversation loading"
```

---

### Task 4: Add duplicate term detection per page

**Files:**
- Modify: `src/sidepanel/App.tsx` (add explained terms tracking)

**Step 1: Add explained terms state**

Add after line 27 (other useState declarations):
```typescript
const [explainedTerms, setExplainedTerms] = useState<Set<string>>(new Set());
```

**Step 2: Load explained terms from conversation**

Update `loadConversation` function (after line 133) to restore explained terms:
```typescript
if (savedConversation) {
  setPendingTerm(savedConversation.term);
  setMessages(savedConversation.messages);
  setPageTitle(savedConversation.pageTitle);
  setPageContent(savedConversation.pageContent);
  setHasExplained(true);
  // Restore explained terms from message history
  const terms = new Set<string>();
  savedConversation.messages.forEach(msg => {
    if (msg.role === 'user') {
      terms.add(msg.content.toLowerCase().trim());
    }
  });
  setExplainedTerms(terms);
}
```

**Step 3: Update saveConversation to include explained terms**

Update `saveConversation` function to store explained terms:
```typescript
const data = {
  term: pendingTerm,
  messages,
  pageTitle,
  pageContent,
  timestamp: Date.now(),
  explainedTerms: Array.from(explainedTerms),
};
```

And update load to restore them:
```typescript
if (savedConversation.explainedTerms) {
  setExplainedTerms(new Set(savedConversation.explainedTerms));
}
```

**Step 4: Modify handleSubmit to check for duplicates**

Update the submit handler (around line 235-250) to check if term already explained:
```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  if (!pendingTerm?.trim() || !pageContent) return;
  
  const normalizedTerm = pendingTerm.toLowerCase().trim();
  
  // Check if term was already explained on this page
  if (explainedTerms.has(normalizedTerm)) {
    // Term already explained, maybe scroll to it or show indicator
    // For now, just return without re-explaining
    console.log(`[Skillmaxing] Term "${pendingTerm}" already explained on this page`);
    return;
  }
  
  // Add to explained terms
  setExplainedTerms(prev => new Set([...prev, normalizedTerm]));
  
  // Continue with existing submit logic...
};
```

**Step 5: Commit**

```bash
git add src/sidepanel/App.tsx
git commit -m "feat: add duplicate term detection per page"
```

---

### Task 5: Update clearConversation for URL-based clearing

**Files:**
- Modify: `src/sidepanel/App.tsx:135-146` (clearConversation function)

**Step 1: Update clearConversation to use URL**

Replace lines 135-146:
```typescript
const clearConversation = () => {
  if (currentTabId !== null) {
    chrome.storage.session.remove([`conversation-${currentTabId}`]);
  }
  setPendingTerm(null);
  setMessages([]);
  setHasExplained(false);
  setError(null);
  setPageTitle(null);
  setPageContent(null);
  lastExplainedTermRef.current = null;
};
```

With URL-based clearing:
```typescript
const clearConversation = () => {
  if (currentPageUrl) {
    const normalizedUrl = normalizeUrl(currentPageUrl);
    // Remove this URL's conversation from the map
    chrome.storage.session.get([STORAGE_KEYS.CONVERSATIONS_MAP]).then(result => {
      const conversationsMap = (result[STORAGE_KEYS.CONVERSATIONS_MAP] as Record<string, unknown>) || {};
      delete conversationsMap[normalizedUrl];
      chrome.storage.session.set({ [STORAGE_KEYS.CONVERSATIONS_MAP]: conversationsMap });
    });
  }
  setPendingTerm(null);
  setMessages([]);
  setHasExplained(false);
  setError(null);
  setPageTitle(null);
  setPageContent(null);
  lastExplainedTermRef.current = null;
  setExplainedTerms(new Set());
};
```

**Step 2: Commit**

```bash
git add src/sidepanel/App.tsx
git commit -m "feat: update clearConversation to use URL-based storage"
```

---

### Task 6: Update auto-explanation effect

**Files:**
- Modify: `src/sidepanel/App.tsx:88-98` (auto-explanation useEffect)

**Step 1: Add duplicate check to auto-explanation**

Current code:
```typescript
useEffect(() => {
  if (pendingTerm && pageContent && !hasExplained && !isLoading) {
    console.log('[Skillmaxing:AutoExplain] Auto-triggering explanation for:', pendingTerm);
    // Small delay to ensure UI is ready
    const timer = setTimeout(() => {
      handleSubmit({ preventDefault: () => {} } as FormEvent);
    }, 100);
    return () => clearTimeout(timer);
  }
}, [pendingTerm, pageContent, hasExplained, isLoading]);
```

Update to check explained terms:
```typescript
useEffect(() => {
  if (pendingTerm && pageContent && !hasExplained && !isLoading) {
    const normalizedTerm = pendingTerm.toLowerCase().trim();
    
    // Check if term was already explained
    if (explainedTerms.has(normalizedTerm)) {
      console.log(`[Skillmaxing:AutoExplain] Term "${pendingTerm}" already explained, skipping`);
      setHasExplained(true); // Mark as explained so UI shows existing conversation
      return;
    }
    
    console.log('[Skillmaxing:AutoExplain] Auto-triggering explanation for:', pendingTerm);
    // Small delay to ensure UI is ready
    const timer = setTimeout(() => {
      handleSubmit({ preventDefault: () => {} } as FormEvent);
    }, 100);
    return () => clearTimeout(timer);
  }
}, [pendingTerm, pageContent, hasExplained, isLoading, explainedTerms]);
```

**Step 2: Commit**

```bash
git add src/sidepanel/App.tsx
git commit -m "feat: add duplicate check to auto-explanation flow"
```

---

### Task 7: Clean up legacy tab-scoped storage references

**Files:**
- Modify: `src/sidepanel/App.tsx` (remove unused tab-based storage logic)

**Step 1: Remove legacy tab-based storage code**

Search and remove any remaining references to:
- `` `conversation-${tabId}` ``
- `` `conversation-${currentTabId}` ``
- Direct tab ID storage operations

**Step 2: Verify no tab-based storage remains**

```bash
grep -n "conversation-\${" src/sidepanel/App.tsx || echo "No legacy storage references found"
```

**Step 3: Commit**

```bash
git add src/sidepanel/App.tsx
git commit -m "refactor: remove legacy tab-scoped conversation storage"
```

---

### Task 8: Build and test

**Files:**
- All modified files

**Step 1: Run TypeScript check**

```bash
npm run build
```

Expected: No TypeScript errors

**Step 2: Build extension**

```bash
npm run build
```

Expected: Successful build in `dist/` directory

**Step 3: Manual testing checklist**

Test scenarios:
- [ ] Explain term on Page A → conversation saved
- [ ] Open same Page A in new tab → same conversation loaded
- [ ] Navigate to Page B in same tab → new conversation started, Page A conversation preserved
- [ ] Go back to Page A → previous conversation restored
- [ ] Try explaining same term twice on Page A → duplicate prevented
- [ ] Click "New Conversation" → current page conversation cleared
- [ ] Open sidepanel on different page → correct conversation loaded

**Step 4: Commit any fixes**

```bash
git add .
git commit -m "fix: address issues from testing"
```

---

### Task 9: Update documentation

**Files:**
- Modify: `docs/plans/2026-03-19-conversation-storage-enhancement.md` (add completion notes)

**Step 1: Mark plan as complete**

Add to end of plan file:
```markdown
---

## Implementation Complete

**Status:** Completed on [DATE]

**Summary:**
- Conversations now keyed by normalized page URL
- Shared across all tabs with same URL
- Duplicate term detection prevents re-explanation
- "New Conversation" only clears current page's conversation

**Testing Notes:**
[Document any edge cases or known issues]
```

**Step 2: Commit**

```bash
git add docs/plans/2026-03-19-conversation-storage-enhancement.md
git commit -m "docs: mark conversation storage enhancement as complete"
```

---

## Edge Cases to Handle

1. **URL normalization edge cases:**
   - Hash fragments (`#section`) should be removed
   - Query parameters should be filtered for tracking params
   - Different protocols (http vs https) treated as different URLs

2. **Storage limits:**
   - `chrome.storage.session` has ~10MB limit
   - Consider implementing LRU eviction if conversations map grows too large

3. **Privacy:**
   - Page content is still stored with conversation (as before)
   - Consider if sensitive URLs should be excluded

4. **Navigation patterns:**
   - SPA navigation (pushState) - may need `chrome.tabs.onUpdated` listener
   - Query param changes that affect content (e.g., `?page=2`)

---

## Testing Strategy

**Manual Testing Steps:**

1. **Basic functionality:**
   - Select text → Explain → verify explanation works
   - Check that conversation persists in sidepanel

2. **Cross-tab sharing:**
   - Open article in Tab 1
   - Open same article in Tab 2
   - Verify same conversation appears in both

3. **Page navigation:**
   - Explain term on Page A
   - Navigate to Page B (different URL)
   - Explain term on Page B
   - Go back to Page A
   - Verify Page A conversation restored

4. **Duplicate prevention:**
   - Explain "machine learning" on Page A
   - Try to explain "Machine Learning" again (case insensitive)
   - Verify no duplicate explanation triggered

5. **New Conversation button:**
   - Explain multiple terms on Page A
   - Click "New Conversation"
   - Verify conversation cleared
   - Navigate away and back
   - Verify cleared state persists (new conversation)

---

## Success Criteria

- [ ] Conversations persist per URL across tab switches
- [ ] Same URL in different tabs shows same conversation
- [ ] Navigating back to a page restores its conversation
- [ ] Duplicate term explanations are prevented
- [ ] "New Conversation" only clears current page's conversation
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] All manual tests pass

---

## Implementation Complete

**Status:** Completed on 2026-03-19

**Summary:**
- Conversations now keyed by normalized page URL
- Shared across all tabs with same URL
- Duplicate term detection prevents re-explanation
- "New Conversation" only clears current page's conversation

**Changes Made:**
1. Created `src/shared/url-utils.ts` with `normalizeUrl()` function
2. Added `CONVERSATIONS_MAP` constant to `src/shared/constants.ts`
3. Updated `saveConversation()` and `loadConversation()` in `App.tsx` to use URL-based storage
4. Added `explainedTerms` state with Set-based tracking per page
5. Updated auto-explanation effect to check for duplicate terms
6. Updated `clearConversation()` to remove specific URL's conversation
7. Removed legacy `currentTabId` state and tab-based storage references
8. Build succeeds with no TypeScript errors

**Testing Notes:**
- Manual testing required to verify cross-tab sharing and navigation patterns
- Storage limit considerations: chrome.storage.session has ~10MB limit
- SPA navigation may need additional listeners for pushState changes
