# Magic Copy

A Firefox browser extension that intercepts **Cmd/Ctrl+C when no text is selected** and shows an ephemeral numbered popup with smart clipboard candidates — always anchored to the mouse cursor.

## What it does

Press Cmd+C (Mac) or Ctrl+C (Windows/Linux) with nothing selected. Instead of silently doing nothing, a picker appears at your cursor with:

| Key | Candidate |
|-----|-----------|
| `0` | Current page URL |
| `1` | Page title |
| `2` | Code block near cursor (if any) |
| `3` | Word under cursor |
| `4` | Sentence under cursor |
| `5` | Paragraph under cursor |

- Press the digit key to copy immediately, or click an item
- Press `Esc` or click anywhere outside to dismiss without copying
- Normal Cmd+C with text selected works exactly as before

## Install (Firefox, development)

1. `npm install && npm run build`
2. Open `about:debugging` in Firefox
3. Click **This Firefox** → **Load Temporary Add-on**
4. Select `dist/manifest.json`

The extension is now active on all pages. Reload any open tabs.

## Development

```bash
npm run build       # one-shot build → dist/
npm run watch       # rebuild on file changes
npm test            # run unit tests
npm run test:watch  # watch mode
```

## Project Structure

```
src/
  content/
    index.ts          # entry point — wires all modules
    keyboard.ts       # Cmd/Ctrl+C interceptor (empty selection only)
    mouse-tracker.ts  # passive mouse position cache
    text-extractor.ts # word/sentence/paragraph/code extraction from cursor position
    candidates.ts     # builds the deduped ranked candidate list
    picker.ts         # Shadow DOM overlay picker UI
  types.ts            # Candidate, MousePos interfaces
tests/
  text-extractor.test.ts
  candidates.test.ts
Documentation/Plans/magic-copy-plan.md
```

## Known Limitations

- Does not run on `about:`, `moz-extension://`, or PDF pages (browser content-script restrictions)
- Cannot extract text from canvas, SVG, or image elements
- Clipboard write requires HTTPS (or the `clipboardWrite` extension permission, which is declared in the manifest)
- Chrome support is planned; requires Manifest V3 and a second manifest

## How it works (technical summary)

1. A `mousemove` listener (capture phase, passive) caches the last cursor position.
2. A `keydown` listener (capture phase) fires when `Cmd/Ctrl+C` is pressed. If `window.getSelection()` is non-empty it does nothing — normal copy proceeds. If empty, it calls `preventDefault()` and triggers the picker.
3. `document.caretPositionFromPoint(x, y)` (Firefox standard) locates the text node at the cursor. From there the code walks the text content for word/sentence/paragraph boundaries and walks the DOM upward for a `<pre>/<code>` ancestor.
4. The picker is injected as a Shadow DOM host on `<html>`, positioned at the cursor, and clipped to the viewport. It handles digit keys and click events, then calls `navigator.clipboard.writeText()` on selection.
