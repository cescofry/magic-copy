import type { Candidate, MousePos } from '../types';

const PICKER_ID = 'magic-copy-host';
const ITEM_HEIGHT = 36;
const PICKER_WIDTH = 420;
const PADDING = 12;

const STYLES = `
  :host {
    all: initial;
    position: fixed;
    z-index: 2147483647;
    font-family: system-ui, -apple-system, sans-serif;
  }
  .picker {
    background: #1e1e2e;
    border: 1px solid #45475a;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    padding: 6px;
    min-width: ${PICKER_WIDTH}px;
    max-width: ${PICKER_WIDTH}px;
    overflow: hidden;
  }
  .header {
    color: #6c7086;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 4px 8px 6px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 10px;
    min-height: ${ITEM_HEIGHT}px;
    box-sizing: border-box;
    border-radius: 5px;
    cursor: pointer;
    color: #cdd6f4;
    font-size: 13px;
    transition: background 80ms;
  }
  li:hover, li.active {
    background: #313244;
  }
  .key {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border: 1px solid #45475a;
    border-radius: 4px;
    background: #313244;
    color: #a6adc8;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
  }
  .badge {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    color: #a6adc8;
    background: #45475a;
    border-radius: 3px;
    padding: 1px 5px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-top: 2px;
  }
  .value {
    flex: 1;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    word-break: break-word;
    line-height: 1.5;
    color: #cdd6f4;
  }
  .hint {
    color: #6c7086;
    font-size: 10px;
    padding: 6px 8px 2px;
    text-align: center;
  }
`;

let host: HTMLDivElement | null = null;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;
let clickOutsideHandler: ((e: MouseEvent) => void) | null = null;

function clampToViewport(x: number, y: number, width: number, height: number): [number, number] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cx = Math.min(x, vw - width - PADDING);
  const cy = Math.min(y, vh - height - PADDING);
  return [Math.max(cx, PADDING), Math.max(cy, PADDING)];
}

function estimateHeight(count: number): number {
  return 32 + count * (ITEM_HEIGHT + 24) + 28 + 24; // header + items (with multiline buffer) + hint + padding
}

export function dismissPicker(): void {
  if (host) {
    host.remove();
    host = null;
  }
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler, { capture: true });
    keyHandler = null;
  }
  if (clickOutsideHandler) {
    document.removeEventListener('click', clickOutsideHandler, { capture: true });
    clickOutsideHandler = null;
  }
}

async function selectCandidate(value: string): Promise<void> {
  dismissPicker();
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // execCommand fallback for HTTP pages
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

export function showPicker(candidates: Candidate[], pos: MousePos): void {
  dismissPicker();

  const estimatedH = estimateHeight(candidates.length);
  const [left, top] = clampToViewport(pos.x + 12, pos.y + 12, PICKER_WIDTH + PADDING * 2, estimatedH);

  host = document.createElement('div');
  host.id = PICKER_ID;
  host.style.cssText = `position:fixed;left:${left}px;top:${top}px;z-index:2147483647;`;

  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = STYLES;

  const picker = document.createElement('div');
  picker.className = 'picker';

  const header = document.createElement('div');
  header.className = 'header';
  header.textContent = 'Magic Copy';
  picker.appendChild(header);

  const ul = document.createElement('ul');
  const valueSpans: HTMLSpanElement[] = [];

  candidates.forEach((c, i) => {
    const li = document.createElement('li');

    const key = document.createElement('span');
    key.className = 'key';
    key.textContent = String(i);

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = c.label;

    const value = document.createElement('span');
    value.className = 'value';
    value.textContent = c.value;
    value.title = c.value;
    valueSpans.push(value);

    li.appendChild(key);
    li.appendChild(badge);
    li.appendChild(value);
    li.addEventListener('click', () => selectCandidate(c.value));
    ul.appendChild(li);
  });

  picker.appendChild(ul);

  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = 'Press 0–9 to copy · Esc to dismiss';
  picker.appendChild(hint);

  shadow.appendChild(style);
  shadow.appendChild(picker);
  document.documentElement.appendChild(host);

  // Shrink font for values that wrap beyond one line
  requestAnimationFrame(() => {
    valueSpans.forEach(span => {
      const h = span.scrollHeight;
      // line-height: 1.5 × 13px ≈ 19.5px per line; thresholds at ~1.5× and ~2.5× single-line
      if (h > 50) {
        span.style.fontSize = '10px';
      } else if (h > 26) {
        span.style.fontSize = '11px';
      }
    });
  });

  keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      dismissPicker();
      return;
    }
    const n = parseInt(e.key, 10);
    if (!isNaN(n) && n >= 0 && n < candidates.length) {
      e.preventDefault();
      e.stopImmediatePropagation();
      selectCandidate(candidates[n].value);
    }
  };
  document.addEventListener('keydown', keyHandler, { capture: true });

  // Dismiss on click outside — use setTimeout so the current click doesn't immediately dismiss
  setTimeout(() => {
    clickOutsideHandler = (e: MouseEvent) => {
      if (!host?.contains(e.target as Node)) {
        dismissPicker();
      }
    };
    document.addEventListener('click', clickOutsideHandler, { capture: true });
  }, 0);
}
