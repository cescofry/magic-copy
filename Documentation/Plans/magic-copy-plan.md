# Magic Copy — Browser Extension Plan

## Context

A Firefox browser extension (Chrome later) that intercepts Cmd/Ctrl+C when no text is selected and shows an ephemeral numbered picker popup at the mouse cursor. The user selects a clipboard candidate by pressing a digit (0–9) or clicking. Candidates are always: page URL (0), page title (1), then content near the cursor (code block, word, sentence, paragraph) in positions 2–5.

No similar extension combines this trigger condition + mouse-aware extraction + numbered picker into one tool. Research confirmed the idea is novel.

---

## Stack

- **Language**: TypeScript
- **Build**: Vite (library/content-script mode)
- **Target**: Firefox, Manifest V2 (Chrome / MV3 later)
- **Testing**: Vitest + jsdom
- **No UI framework** — Shadow DOM + vanilla DOM is sufficient for a simple numbered list

---

## Project Structure

```
magic-copy/
├── src/
│   ├── content/
│   │   ├── index.ts          # Wires all modules, registers listeners
│   │   ├── keyboard.ts       # Intercepts Cmd/Ctrl+C on empty selection
│   │   ├── mouse-tracker.ts  # Caches last mouse { x, y }
│   │   ├── text-extractor.ts # caretPositionFromPoint → word/sentence/para/code
│   │   ├── candidates.ts     # Assembles + deduplicates the ranked candidate list
│   │   └── picker.ts         # Shadow DOM overlay: renders list, handles input, writes clipboard
│   └── types.ts              # Shared types (Candidate, MousePos)
├── tests/
│   ├── text-extractor.test.ts
│   └── candidates.test.ts
├── Documentation/
│   └── Plans/
│       └── magic-copy-plan.md
├── manifest.json             # Firefox MV2
├── vite.config.ts
├── tsconfig.json
├── package.json
├── README.md
└── .gitignore
```

---

## Module Design

### `types.ts`
```ts
export interface Candidate { label: string; value: string; }
export interface MousePos  { x: number; y: number; }
```

### `mouse-tracker.ts`
- `mousemove` listener on `document` at capture phase
- Stores last `{ x, y }` in a module-level variable
- Exports `getMousePos(): MousePos`

### `keyboard.ts`
- `keydown` listener (capture phase, priority over page scripts)
- Trigger condition: `(e.metaKey || e.ctrlKey) && e.key === 'c' && window.getSelection().toString() === ''`
- Calls `event.preventDefault()` on trigger, then fires callback
- Exports `registerCopyInterceptor(callback: () => void): () => void` (returns cleanup fn)

### `text-extractor.ts`
- `extractCandidates(x: number, y: number): Candidate[]`
- Uses `document.caretPositionFromPoint(x, y)` (Firefox) with fallback to `document.caretRangeFromPoint(x, y)` for future Chrome
- Returns up to 4 candidates in priority order:
  1. **Code block**: walk DOM ancestor for `<pre>` or `<code>` element, use `textContent`
  2. **Word**: expand from caret offset to word boundaries in `textNode.textContent`
  3. **Sentence**: expand to sentence boundaries (`.`, `!`, `?` delimiters)
  4. **Paragraph**: expand to block boundaries (walk up to block-level ancestor, use `innerText`)
- Returns only non-empty, non-duplicate strings
- Guards: `null` caret (canvas/SVG/image) returns `[]`

### `candidates.ts`
- `buildCandidates(extracted: Candidate[]): Candidate[]`
- Always prepends `{ label: 'URL', value: location.href }` and `{ label: 'Title', value: document.title }`
- Deduplicates (case-sensitive exact match)
- Caps list at 10 items (digit keys 0–9)

### `picker.ts`
- `showPicker(candidates: Candidate[], pos: MousePos): void`
- Creates a `<div>` host, attaches Shadow DOM, renders a `<ul>` with items `0: URL`, `1: Title`, `2: word...`, etc.
- Positions via `style.left/top` at mouse coords, clamped to viewport edges
- Keyboard listener: digit key (0–9) → `selectCandidate(n)`
- Click listener on each item → `selectCandidate(n)`
- `Escape` or click-outside → `dismissPicker()`
- `selectCandidate(n)`: calls `navigator.clipboard.writeText(value)`, then dismisses
- Only one picker instance at a time (dismisses previous on re-trigger)

### `content/index.ts`
- Registers `mouse-tracker` listener
- Registers keyboard interceptor → on trigger: extract → build → show picker
- Exports nothing (content script entry point)

---

## Manifest (Firefox MV2)

```json
{
  "manifest_version": 2,
  "name": "Magic Copy",
  "version": "0.1.0",
  "description": "Smart clipboard picker on Cmd/Ctrl+C with no selection.",
  "permissions": ["clipboardWrite"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle",
    "all_frames": true
  }]
}
```

Note: No `activeTab` needed — content scripts handle everything inline. `clipboardWrite` is required for `navigator.clipboard.writeText`.

---

## Build (Vite)

```ts
// vite.config.ts
build: {
  lib: { entry: 'src/content/index.ts', formats: ['iife'], name: 'MagicCopy', fileName: () => 'content.js' },
  outDir: 'dist',
  rollupOptions: { output: { inlineDynamicImports: true } }
}
```

After build, `dist/` contains `content.js` + `manifest.json` (copied via Vite plugin or npm script). Load as a temporary extension in Firefox with `about:debugging`.

---

## Testing Strategy

### Unit tests (Vitest + jsdom)
- `text-extractor.test.ts`: build a DOM tree with known text, call `extractCandidates(x, y)` against mocked `caretPositionFromPoint`, assert word/sentence/paragraph extraction
- `candidates.test.ts`: assert URL always first, title always second, deduplication works, list caps at 10

### Manual integration test (Firefox)
1. Load `dist/` as temporary extension via `about:debugging`
2. Open any web page (e.g. MDN)
3. Without selecting anything, press Cmd/Ctrl+C → picker appears at cursor
4. Press `0` → URL written to clipboard (verify with paste)
5. Press `1` → title written
6. Move cursor over a code block, trigger → code block appears as candidate
7. Press `Escape` → picker dismisses without changing clipboard
8. Select text normally and press Cmd+C → picker does NOT appear (normal copy works)

---

## Known Limitations (to document)

- Does not work on `about:`, `moz-extension://`, or PDF pages (content script restrictions)
- `caretPositionFromPoint` returns `null` over canvas, SVG, images — silently skipped
- Clipboard write requires a secure context (HTTPS) or Firefox extension permission

---

## Files to Create

All files are new — this is a greenfield project in `/Users/ffrison/Dev/Ziofritz/Tests/magic-copy`.
