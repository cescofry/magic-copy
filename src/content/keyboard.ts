type Callback = () => void;

export function registerCopyInterceptor(callback: Callback): () => void {
  function onKeyDown(e: KeyboardEvent): void {
    const isCopy = (e.metaKey || e.ctrlKey) && e.key === 'c';
    if (!isCopy) return;

    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    callback();
  }

  document.addEventListener('keydown', onKeyDown, { capture: true });
  return () => document.removeEventListener('keydown', onKeyDown, { capture: true });
}
