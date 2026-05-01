# Magic Copy

A browser extension (Firefox + Chrome) that intercepts **Cmd/Ctrl+C when no text is selected** and shows an ephemeral numbered popup with smart clipboard candidates — always anchored to the mouse cursor.

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

## Install from a GitHub Release

Go to the [Releases page](../../releases) and download the zip for your browser.

### Firefox

1. Download `magic-copy-firefox-…-an+fx.xpi` from the release
2. Click it — Firefox will prompt to install

The `.xpi` is signed via AMO (unlisted), so it installs permanently in any standard Firefox release and survives restarts.

### Chrome

1. Download `magic-copy-chrome.zip` and extract it
2. Open `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** → select the extracted folder

> **Note:** Chrome requires Developer mode to remain enabled for sideloaded extensions. The extension persists across Chrome restarts as long as Developer mode stays on.

## Development

```bash
npm install

npm run build           # build both Firefox and Chrome → dist/firefox/ + dist/chrome/
npm run build:firefox   # Firefox only → dist/firefox/
npm run build:chrome    # Chrome only  → dist/chrome/

npm run watch:firefox   # rebuild Firefox on file changes
npm run watch:chrome    # rebuild Chrome on file changes

npm test                # run unit tests
npm run test:watch      # watch mode

npm run package         # zip both builds → magic-copy-firefox.zip + magic-copy-chrome.zip
```

### Loading during development

**Firefox:** `about:debugging` → This Firefox → Load Temporary Add-on → `dist/firefox/manifest.json`

**Chrome:** `chrome://extensions` → Developer mode ON → Load unpacked → `dist/chrome/`

## Releasing

Push a version tag and the CI workflow builds, packages, and publishes both zips to a GitHub Release automatically:

```bash
git tag v0.2.0
git push origin v0.2.0
```

Users download the zip from the release, extract it, and follow the install steps above.

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
manifest.firefox.json   # Firefox MV2 manifest
manifest.chrome.json    # Chrome MV3 manifest
.github/workflows/release.yml
Documentation/Plans/magic-copy-plan.md
```

## Known Limitations

- Does not run on `about:`, `moz-extension://`, `chrome-extension://`, or PDF pages
- Cannot extract text from canvas, SVG, or image elements
- Clipboard write requires HTTPS (or the extension's `clipboardWrite` permission, which is declared in both manifests)

## How it works (technical summary)

1. A `mousemove` listener (capture phase, passive) caches the last cursor position.
2. A `keydown` listener (capture phase) fires when `Cmd/Ctrl+C` is pressed. If `window.getSelection()` is non-empty it does nothing — normal copy proceeds. If empty, it calls `preventDefault()` and triggers the picker.
3. `document.caretPositionFromPoint(x, y)` (Firefox) or `document.caretRangeFromPoint(x, y)` (Chrome) locates the text node at the cursor. From there the code walks the text content for word/sentence/paragraph boundaries and walks the DOM upward for a `<pre>/<code>` ancestor.
4. The picker is injected as a Shadow DOM host on `<html>`, positioned at the cursor, and clipped to the viewport. It handles digit keys and click events, then calls `navigator.clipboard.writeText()` on selection.

