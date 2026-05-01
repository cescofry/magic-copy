import { startTracking, getMousePos } from './mouse-tracker';
import { registerCopyInterceptor } from './keyboard';
import { extractCandidates } from './text-extractor';
import { buildCandidates } from './candidates';
import { showPicker } from './picker';

function onCopyWithNoSelection(): void {
  const pos = getMousePos();
  const extracted = extractCandidates(pos.x, pos.y);
  const candidates = buildCandidates(extracted);
  if (candidates.length === 0) return;
  showPicker(candidates, pos);
}

startTracking();
registerCopyInterceptor(onCopyWithNoSelection);
