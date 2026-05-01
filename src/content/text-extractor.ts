import type { Candidate } from '../types';

const BLOCK_ELEMENTS = new Set([
  'P', 'DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE',
  'LI', 'DD', 'DT', 'TD', 'TH', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
]);

function getCaretNode(x: number, y: number): { node: Text; offset: number } | null {
  // Firefox standard
  if ('caretPositionFromPoint' in document) {
    const pos = (document as Document & { caretPositionFromPoint(x: number, y: number): { offsetNode: Node; offset: number } | null }).caretPositionFromPoint(x, y);
    if (!pos || pos.offsetNode.nodeType !== Node.TEXT_NODE) return null;
    return { node: pos.offsetNode as Text, offset: pos.offset };
  }
  // Chrome fallback (future)
  if ('caretRangeFromPoint' in document) {
    const range = (document as Document & { caretRangeFromPoint(x: number, y: number): Range | null }).caretRangeFromPoint(x, y);
    if (!range || range.startContainer.nodeType !== Node.TEXT_NODE) return null;
    return { node: range.startContainer as Text, offset: range.startOffset };
  }
  return null;
}

function extractWord(text: string, offset: number): string {
  let start = offset;
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  let end = offset;
  while (end < text.length && !/\s/.test(text[end])) end++;
  return text.slice(start, end).trim();
}

function extractSentence(text: string, offset: number): string {
  const terminators = /[.!?]/;
  let start = offset;
  let end = offset;

  while (start > 0 && !terminators.test(text[start - 1])) start--;
  while (end < text.length && !terminators.test(text[end])) end++;
  if (end < text.length) end++;

  return text.slice(start, end).trim();
}

function findCodeBlock(node: Node): string | null {
  let current: Node | null = node;
  while (current) {
    const tag = (current as Element).tagName;
    if (tag === 'PRE' || tag === 'CODE') {
      const text = (current as Element).textContent?.trim();
      return text || null;
    }
    current = current.parentElement;
  }
  return null;
}

function findParagraph(node: Node): string {
  let current: Node | null = node.parentElement;
  while (current) {
    const tag = (current as Element).tagName;
    if (BLOCK_ELEMENTS.has(tag)) {
      const el = current as HTMLElement;
      return (el.innerText ?? el.textContent ?? '').trim();
    }
    current = current.parentElement;
  }
  return (node.textContent ?? '').trim();
}

export function extractCandidates(x: number, y: number): Candidate[] {
  const caret = getCaretNode(x, y);
  if (!caret) return [];

  const { node, offset } = caret;
  const text = node.textContent ?? '';
  const results: Candidate[] = [];
  const seen = new Set<string>();

  function add(label: string, value: string): void {
    const v = value.trim();
    if (v && !seen.has(v)) {
      seen.add(v);
      results.push({ label, value: v });
    }
  }

  const codeBlock = findCodeBlock(node);
  if (codeBlock) add('Code', codeBlock);

  add('Word', extractWord(text, offset));
  add('Sentence', extractSentence(text, offset));
  add('Paragraph', findParagraph(node));

  return results;
}
