## Project overview

**Skillmaxing.ai** is a Chrome extension that helps users understand unfamiliar terms while reading articles, blog posts, or social media. When users select text and right-click, a side panel opens with an AI-powered explanation in context.

---

## Build commands

```bash
npm run dev          # Development server with hot reload
npm run build        # TypeScript check + production build
npm run preview      # Preview production build locally
```

---

## Code style guidelines

### TypeScript
- Strict mode enabled — no implicit any, unused locals/parameters checked
- Use explicit types for function parameters and return types
- Prefer `type` over `interface` for simple shapes
- Use `interface` for extensible object types

### Imports
- Group imports: React → external libs → internal modules → types
- Use absolute imports from `src/` root
- Always use `import type { ... }` for type-only imports
- Order: side effects first, then named imports

### Naming conventions
- **Components**: PascalCase (`AssistantMessage.tsx`)
- **Functions/variables**: camelCase (`sendMessage`, `isLoading`)
- **Constants**: UPPER_SNAKE_CASE for true constants (`MESSAGE_TYPES`)
- **Types/Interfaces**: PascalCase (`ExtensionMessage`, `Settings`)
- **Files**: kebab-case for non-component files, PascalCase for components

### Formatting
- 2 spaces for indentation
- Single quotes for strings
- Trailing commas in multiline objects/arrays
- Max line length: 100 characters (soft limit)
- Semicolons: optional but be consistent within a file

### Error handling
- Always handle `chrome.runtime.lastError` after async Chrome API calls
- Use try/catch for async operations with meaningful error messages
- Log errors with context using `[Skillmaxing:Context]` prefix format
- Propagate user-facing errors to UI with clear messaging

### Logging
- Use structured logging with prefixes: `[Skillmaxing:Flow]`, `[Skillmaxing:Stream]`, `[Skillmaxing:Retry]`
- Include relevant context (tabId, url, duration) in log objects
- Avoid logging sensitive data (API keys, tokens)

### React patterns
- Use functional components with hooks
- Prefer `useCallback` for handlers passed to children
- Use `useRef` for mutable values that don't trigger re-renders
- Clean up effects and event listeners in return functions

### Chrome extension rules
- Never store API keys in content scripts — only in background service worker
- Always read settings from `chrome.storage.local` in background
- Use `chrome.runtime.Port` for streaming between contexts
- Clone DOM with `document.cloneNode(true)` before Readability extraction
- Truncate page content to 4000 characters before AI prompts

---

## Testing

No test framework is currently configured. If adding tests:

```bash
# Install and configure Vitest (recommended for Vite projects)
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# Run all tests
npx vitest

# Run single test file
npx vitest run src/path/to/test.ts

# Run tests in watch mode
npx vitest --watch
```

---

## Project structure

```
src/
├── background/          # Service worker (MV3)
│   ├── index.ts        # Main background script
│   └── search-providers/ # Web search implementations
├── content/            # Content script injected into pages
│   └── index.ts
├── sidepanel/          # React app for side panel UI
│   ├── App.tsx
│   ├── main.tsx
│   └── components/
├── options/            # Extension options page
│   └── App.tsx
└── shared/             # Shared across all contexts
    ├── types.ts
    └── constants.ts
```

---

## Key implementation rules

- **API keys**: Only accessed in `background/index.ts` via `chrome.storage.local`
- **Streaming**: Use `streamText` from Vercel AI SDK, pipe chunks through Port
- **AI SDK**: Use `@ai-sdk/react` only in side panel, `ai` + `@ai-sdk/openai` only in background
- **Storage**: Settings in `chrome.storage.local`, chat state in `chrome.storage.session`
- **Content extraction**: Always clone document before Readability, truncate to 4000 chars
- **Race conditions**: Side panel signals ready before background sends messages (use 300ms delay)

---

## Phase progress

See [PHASES.md](./PHASES.md) for detailed tracker.

| Phase | Name | Status |
|---|---|---|
| 0-4 | Core features | Done |
| 5 | API key settings + polish | In progress |
| 6 | Backend + productization | Not started |
