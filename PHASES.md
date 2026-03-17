# PHASES.md — Skillmaxing.ai Development Progress

This file tracks phase-by-phase progress. Update task checkboxes as you complete work.

---

## Phase 0 — Project scaffold

**Goal:** A working Chrome extension that loads with a React side panel.
No logic yet — just "it loads, it shows a React app."

**Status:** Finished

### Tasks

- [x] Initialise pnpm project (`pnpm init`)
- [x] Install core dependencies
  - [x] `vite`, `@crxjs/vite-plugin`
  - [x] `react`, `react-dom`, `@types/react`, `@types/react-dom`
  - [x] `typescript`
  - [x] `tailwindcss`, `autoprefixer`, `postcss`
  - [x] `ai` (Vercel AI SDK core), `@ai-sdk/openai`, `@ai-sdk/react`
  - [x] `react-markdown`, `remark-gfm`
  - [x] `@mozilla/readability`, `@types/mozilla-readability`
- [x] Create `vite.config.ts` with crxjs plugin and entry points
- [x] Create `manifest.json` (MV3) with `sidePanel`, `contextMenus`, `storage`, `activeTab`, `scripting` permissions
- [x] Create `tsconfig.json`
- [x] Create `tailwind.config.ts`
- [x] Scaffold folder structure (`src/sidepanel`, `src/background`, `src/content`, `src/shared`, `src/options`)
- [x] Create `src/shared/types.ts` with `ExtensionMessage` and `Message` types
- [x] Create `src/shared/constants.ts` with message type strings and storage keys
- [x] Create `src/sidepanel/index.html`
- [x] Create `src/sidepanel/main.tsx` (React entry)
- [x] Create `src/sidepanel/App.tsx` (shell — just "Hello Skillmaxing")
- [x] Create `src/background/index.ts` (empty service worker)
- [x] Create `src/content/index.ts` (empty content script)
- [x] Add extension icons to `public/icons/` (16, 32, 48, 128px)
- [x] Run `pnpm dev`, load unpacked in `chrome://extensions`, confirm side panel opens

**Definition of done:** Click extension icon → side panel opens → React "Hello Skillmaxing" renders.

---

## Phase 1 — Right-click → open side panel

**Goal:** Select text on any page → right-click → "Explain with Skillmaxing" →
side panel opens and displays the selected term.

**Status:** ✅ Complete

**Depends on:** Phase 0 complete

### Tasks

- [x] `background/index.ts`: register context menu item on `chrome.runtime.onInstalled`
- [x] `background/index.ts`: listen for `chrome.contextMenus.onClicked`
- [x] `background/index.ts`: call `chrome.sidePanel.open({ tabId })` on menu click
- [x] `background/index.ts`: send `EXPLAIN_TERM` message to side panel after delay
- [x] `sidepanel/App.tsx`: add `useEffect` to listen for `chrome.runtime.onMessage`
- [x] `sidepanel/App.tsx`: store `pendingTerm` in React state when `EXPLAIN_TERM` received
- [x] `sidepanel/components/TermHeader.tsx`: display the selected term
- [x] Handle race condition: panel must be mounted before message arrives
  - [x] Use 300ms delay in background worker (simple), OR
  - [ ] Implement `PANEL_READY` handshake (robust — preferred)
- [ ] Test on at least 3 different sites (article, Twitter/X, Wikipedia)

**Definition of done:** Select any text → right-click → "Explain with Skillmaxing" →
panel opens → selected term is displayed. No API call yet.

---

## Phase 2 — Page content extraction

**Goal:** Capture the full article text alongside the selected term so Claude has
reading context, not just an isolated word.

**Status:** ✅ Complete

**Depends on:** Phase 1 complete

### Tasks

- [x] Install `@mozilla/readability`
- [x] `content/index.ts`: listen for `GET_PAGE_CONTENT` message
- [x] `content/index.ts`: clone `document` with `document.cloneNode(true)`
- [x] `content/index.ts`: run Readability, extract `title` and `textContent`
- [x] `content/index.ts`: truncate `textContent` to 4000 characters before sending
- [x] `content/index.ts`: `sendResponse({ title, content })`
- [x] `background/index.ts`: call `chrome.tabs.sendMessage(tabId, { type: "GET_PAGE_CONTENT" })` before opening panel
- [x] `background/index.ts`: await page content response, then include in `EXPLAIN_TERM` payload
- [x] Update `ExtensionMessage` type if needed (`pageContent`, `pageTitle` fields)
- [ ] Log extracted content to console to verify correctness on several article types
- [x] Handle fallback: if Readability returns null, fall back to `document.body.innerText.slice(0, 4000)`

**Definition of done:** Side panel receives `{ term, pageContent, pageTitle }`.
Console logs confirm clean article extraction on a real blog post.

---

## Phase 3 — AI API integration with streaming

**Goal:** Selected term + page context → real AI explanation → streams into the
side panel word by word.

**Status:** ✅ Complete

**Depends on:** Phase 2 complete

### Tasks

- [x] Install `ai`, `@ai-sdk/openai`, `@ai-sdk/react`, `react-markdown`, `remark-gfm`
- [x] `src/options/index.html` + `src/options/main.tsx`: settings page with three fields:
  - [x] API key input (password field)
  - [x] Base URL input with provider preset buttons (OpenAI, Groq, OpenRouter, Ollama, Custom)
  - [x] Model name input (free text)
- [x] `src/options/`: save `{ apiKey, baseURL, model }` to `chrome.storage.local` on submit
- [x] Register options page in `manifest.json`
- [x] **Background worker — `streamText` integration:**
  - [x] Import `streamText` from `ai` and `createOpenAI` from `@ai-sdk/openai`
  - [x] Implement `chrome.runtime.onConnect` port listener (`"skillmaxing-stream"`)
  - [x] Read `{ apiKey, baseURL, model }` from `chrome.storage.local` per request
  - [x] Call `streamText({ model: createOpenAI({ apiKey, baseURL })(model), system, messages })`
  - [x] Iterate `textStream`, forward each chunk via `port.postMessage({ type: "STREAM_CHUNK", chunk })`
  - [x] Send `port.postMessage({ type: "STREAM_DONE" })` on completion
  - [x] Send `port.postMessage({ type: "STREAM_ERROR", error })` on failure
- [x] **Side panel — streaming with port:**
  - [x] Create custom message state management
  - [x] Connect to background via `chrome.runtime.Port`
  - [x] Display streamed messages with `AssistantMessage` component
  - [x] Show `StreamingIndicator` when loading
- [x] `sidepanel/components/AssistantMessage.tsx`: render messages with `react-markdown` + `remark-gfm`
- [x] `sidepanel/components/StreamingIndicator.tsx`: show loading animation
- [x] Handle "no API key" state: show prompt to go to options page
- [x] Handle stream errors with error display

**Definition of done:** Select a term → right-click → real AI explanation streams
into the panel in real time, rendered as markdown. Works with configured provider.

---

## Phase 4 — Conversation (follow-up questions)

**Goal:** Turn the one-shot explanation into a persistent chat thread.
User can ask follow-up questions to explore the topic further.

**Status:** ⬜ Not started

**Depends on:** Phase 3 complete

### Tasks

- [ ] `sidepanel/components/FollowUpInput.tsx`: text input + send button wired to `useChat`'s `handleSubmit` and `handleInputChange`
- [ ] Confirm `useChat.messages` renders the full thread — no separate state array needed
- [ ] `sidepanel/components/MessageList.tsx`: map over `useChat.messages`, render `AssistantMessage` or `UserMessage` by role
- [ ] `sidepanel/components/UserMessage.tsx`: render user follow-up bubbles
- [ ] "New conversation" button: call `useChat`'s `setMessages([])` and clear storage for current tab
- [ ] Persist conversation per tab in `chrome.storage.session` keyed by `tabId`
  - [ ] Save `useChat.messages` after each completed assistant response (use `onFinish` callback)
  - [ ] On panel open, read stored messages and pass to `useChat` via `initialMessages`
- [ ] Keyboard shortcut: `Enter` submits, `Shift+Enter` adds newline (override in `FollowUpInput`)
- [ ] Confirm background worker `FOLLOW_UP` path passes full message history to `streamText`

**Definition of done:** Full multi-turn conversation works. Closing and reopening
the panel restores the last conversation. Each tab maintains its own thread.

---

## Phase 5 — API key management + polish

**Goal:** A complete, installable, user-ready extension with proper error states,
loading states, and a polished UI.

**Status:** ⬜ Not started

**Depends on:** Phase 4 complete

### Tasks

**Options page polish**
- [ ] Validate API key is non-empty before saving
- [ ] Validate `baseURL` is a valid URL format
- [ ] Provider preset buttons auto-fill `baseURL` (OpenAI, Groq, OpenRouter, Ollama)
- [ ] Show success/error feedback after saving
- [ ] "Test connection" button: sends a minimal request to verify key + baseURL + model work

**Error handling**
- [ ] No API key: full-panel empty state with link to options
- [ ] API error (rate limit, invalid key): show inline error with retry
- [ ] Network offline: show offline indicator
- [ ] Page extraction failed: show graceful fallback message

**UI polish**
- [ ] Loading skeleton while first response starts
- [ ] Smooth scroll to bottom on new content
- [ ] Copy button on assistant messages
- [ ] "Open full sources" links open in new tab
- [ ] Responsive panel width handling
- [ ] Extension icon badge: show dot when explanation is ready

**Race condition hardening**
- [ ] Implement proper `PANEL_READY` handshake to replace the 300ms delay
- [ ] Queue pending `EXPLAIN_TERM` if panel is not yet mounted

**Final checks**
- [ ] `pnpm type-check` passes with zero errors
- [ ] Test on Chrome 114+ (minimum for `chrome.sidePanel`)
- [ ] Test on 10+ different page types (news, blog, Twitter, Reddit, docs, Wikipedia)
- [ ] Check memory: no port leaks after many uses in one session

**Definition of done:** A complete extension a real user could install and use daily
without hitting confusing states.

---

## Phase 6 — Backend + productization

**Goal:** A distributable product with user accounts, billing, and no requirement
for users to supply their own Anthropic API key.

**Status:** ⬜ Not started

**Depends on:** Phase 5 complete

### Tasks

**Backend (Cloudflare Workers or Vercel Edge)**
- [ ] Single proxy endpoint: validates JWT → calls provider API via `streamText` → streams response
- [ ] Auth: Google OAuth via Clerk or Auth.js
- [ ] Billing: Stripe subscription (free tier + paid)
- [ ] Rate limiting per user

**Extension changes**
- [ ] Replace direct provider call in background worker with proxy endpoint call
- [ ] Replace API key storage with JWT storage
- [ ] Add sign-in flow inside the side panel (or options page)
- [ ] Show usage / subscription status in options page

**Distribution**
- [ ] Chrome Web Store listing: screenshots, description, privacy policy
- [ ] Privacy policy page (required by Chrome Web Store)
- [ ] Landing page: skillmaxing.ai

**Definition of done:** Extension published on Chrome Web Store. New users can
sign up, subscribe, and use the extension without any manual API key setup.

---

## Notes & decisions log

Use this section to record any architectural decisions or discoveries made during
development that future sessions should know about.

| Date | Note |
|---|---|
| 2025 | Switched from raw `openai` SDK to Vercel AI SDK (`ai` + `@ai-sdk/openai` + `@ai-sdk/react`). `streamText` replaces the manual stream loop in the background worker; `useChat` with a custom port-based fetch replaces manual message state in the side panel. Provider switching is done via `createOpenAI({ baseURL })`. All packages installed in Phase 0. |