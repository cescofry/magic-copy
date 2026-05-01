import type { MousePos } from '../types';

let last: MousePos = { x: 0, y: 0 };

function onMouseMove(e: MouseEvent): void {
  last = { x: e.clientX, y: e.clientY };
}

export function startTracking(): void {
  document.addEventListener('mousemove', onMouseMove, { capture: true, passive: true });
}

export function getMousePos(): MousePos {
  return last;
}
