## Project overview

**Skillmaxing.ai** is a Chrome extension that helps users understand unfamiliar terms
while reading articles, blog posts, or social media. The workflow is:

1. User selects a term on any webpage
2. Right-clicks → chooses "Explain with Skillmaxing"
3. A Chrome side panel opens on the right
4. An AI agent explains the selected term **in the context of the page being read**,
   with optional web search for additional sources
5. User can ask follow-up questions in a persistent chat thread

---

## Tech stack

| Layer | Choice |
|---|---|
| Extension standard | Chrome Manifest V3 |
| Bundler | Vite + `@crxjs/vite-plugin` |
| UI framework | React + TypeScript |
| Styling | Tailwind CSS |
| AI streaming — background | `ai` (Vercel AI SDK core) + `@ai-sdk/openai` — `streamText()` |
| AI streaming — side panel | `@ai-sdk/react` — `useChat()` with custom port transport |
| Provider switching | `createOpenAI({ baseURL, apiKey })` — any OpenAI-compatible API |
| Model | Configurable — stored in `chrome.storage.local` |
| Markdown rendering | `react-markdown` + `remark-gfm` (for assistant messages) |
| Page extraction | `@mozilla/readability` |
| Transport layer | `chrome.runtime.Port` (bridges `useChat` ↔ background worker) |
| Persistence | `chrome.storage.local` (settings) + `chrome.storage.session` (chat state) |

---

## Project structure

```
skillmaxing/
├── CLAUDE.md                  ← You are here
├── PHASES.md                  ← Phase-by-phase progress tracker
├── manifest.json              ← Chrome MV3 extension config
├── vite.config.ts             ← crxjs plugin + entry points
├── tailwind.config.ts
├── tsconfig.json
├── src/
│   ├── sidepanel/
│   │   ├── index.html         ← Side panel HTML shell
│   │   ├── main.tsx           ← React entry point
│   │   ├── App.tsx            ← Root component, message listener
│   │   └── components/
│   │       ├── TermHeader.tsx
│   │       ├── MessageList.tsx
│   │       ├── AssistantMessage.tsx
│   │       ├── UserMessage.tsx
│   │       ├── StreamingIndicator.tsx
│   │       └── FollowUpInput.tsx
│   ├── background/
│   │   └── index.ts           ← Service worker: context menu, API calls, port streaming
│   ├── content/
│   │   └── index.ts           ← Content script: page extraction via Readability
│   ├── options/
│   │   ├── index.html         ← Extension options page
│   │   └── main.tsx           ← API key, baseURL, model input + settings
│   └── shared/
│       ├── types.ts           ← Shared Message, ExtensionMessage types
│       └── constants.ts       ← Message type strings, storage keys
└── public/
    └── icons/                 ← 16, 32, 48, 128px PNGs
```

---

## Architecture: how the three contexts communicate

Chrome MV3 splits the extension into isolated worlds. Communication is always
via message passing — never shared memory or direct imports across contexts.

```
┌─────────────────────────────────────────────────────────────┐
│  WEBPAGE (any tab)                                          │
│                                                             │
│  content/index.ts                                           │
│  - Runs on every page via content_scripts manifest entry    │
│  - Listens for GET_PAGE_CONTENT message                     │
│  - Uses Readability to extract clean article text           │
│  - Returns { title, content } (content truncated to 4000ch) │
└───────────────────┬─────────────────────────────────────────┘
                    │ chrome.tabs.sendMessage / onMessage
┌───────────────────▼─────────────────────────────────────────┐
│  BACKGROUND SERVICE WORKER                                  │
│                                                             │
│  background/index.ts                                        │
│  - Registers context menu on install                        │
│  - On menu click: fetches page content, opens side panel,   │
│    then streams AI response via Port                        │
│  - Reads apiKey, baseURL, model from chrome.storage.local   │
│  - Uses Vercel AI SDK: createOpenAI() + streamText()        │
│  - Pipes streamText chunks → port.postMessage() to panel    │
└───────────────────┬─────────────────────────────────────────┘
                    │ chrome.runtime.Port (persistent)
                    │ custom fetch transport bridges Port ↔ useChat
┌───────────────────▼─────────────────────────────────────────┐
│  SIDE PANEL (React app)                                     │
│                                                             │
│  sidepanel/App.tsx                                          │
│  - useChat() from @ai-sdk/react manages all chat state      │
│  - Custom fetch override routes through chrome.runtime.Port │
│  - Renders streamed markdown via react-markdown             │
│  - Follow-up input wired directly to useChat's append()     │
└─────────────────────────────────────────────────────────────┘
```

---

## Key implementation rules

- **Never** put the API key in the content script. It must only be read from
  `chrome.storage.local` inside `background/index.ts`.
- **Never** hardcode `apiKey`, `baseURL`, or `model` — always read from storage.
- **Never** import `@ai-sdk/react` in the background worker — service workers have
  no React context. Only import `ai` and `@ai-sdk/openai` there.
- **Always** use `streamText` (not `generateText`) in the background worker so
  chunks are forwarded to the port as they arrive.
- **Always** truncate page content to 4000 characters before including in prompts.
- **Always** clone `document` before passing to Readability: `document.cloneNode(true)`.
- **Never** use `position: fixed` in the side panel UI (iframes don't support it well).
- Side panel must signal `PANEL_READY` before the background worker sends `EXPLAIN_TERM`.
  Use a 300ms delay or a proper handshake to avoid the race condition on first open.
- `useChat` message history is the single source of truth — do not maintain a
  separate `Message[]` array alongside it.
- Conversation history is persisted per-tab in `chrome.storage.session`, keyed by
  `tabId`, and hydrated back into `useChat` via its `initialMessages` option.
- The options page (`src/options/`) handles `apiKey`, `baseURL`, and `model` — never commit keys.

---

## Phase progress

See **[PHASES.md](./PHASES.md)** for the detailed phase tracker.

Current status is tracked there — always check PHASES.md before starting work
to understand what is complete, what is in progress, and what comes next.

### Quick summary

| Phase | Name | Status |
|---|---|---|
| 0 | Project scaffold | Done |
| 1 | Right-click → open side panel | ⬜ Not started |
| 2 | Page content extraction | ⬜ Not started |
| 3 | AI API + streaming | ⬜ Not started |
| 4 | Conversation (follow-ups) | ⬜ Not started |
| 5 | API key settings + polish | ⬜ Not started |
| 6 | Backend + productization | ⬜ Not started |

Update PHASES.md (not this file) when phase status changes.
