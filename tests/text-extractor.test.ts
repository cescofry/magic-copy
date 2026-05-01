import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractCandidates } from '../src/content/text-extractor';

function makeTextNode(text: string): Text {
  return document.createTextNode(text);
}

function mockCaret(node: Text, offset: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (document as any).caretPositionFromPoint = vi.fn().mockReturnValue({ offsetNode: node, offset });
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('extractCandidates', () => {
  it('returns empty array when caretPositionFromPoint returns null', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).caretPositionFromPoint = vi.fn().mockReturnValue(null);
    expect(extractCandidates(0, 0)).toEqual([]);
  });

  it('returns empty array when caret lands on a non-text node', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).caretPositionFromPoint = vi.fn().mockReturnValue({ offsetNode: document.body, offset: 0 });
    expect(extractCandidates(0, 0)).toEqual([]);
  });

  it('extracts the word under the cursor', () => {
    const node = makeTextNode('Hello world foo');
    mockCaret(node, 6); // cursor in "world"
    const results = extractCandidates(0, 0);
    const word = results.find(r => r.label === 'Word');
    expect(word?.value).toBe('world');
  });

  it('extracts a sentence under the cursor', () => {
    const node = makeTextNode('First sentence. Second sentence. Third one.');
    mockCaret(node, 20); // cursor in "Second sentence"
    const results = extractCandidates(0, 0);
    const sentence = results.find(r => r.label === 'Sentence');
    expect(sentence?.value).toBe('Second sentence.');
  });

  it('detects a code block ancestor', () => {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = 'const x = 1;';
    pre.appendChild(code);
    document.body.appendChild(pre);

    const textNode = code.firstChild as Text;
    mockCaret(textNode, 3);

    const results = extractCandidates(0, 0);
    const codeResult = results.find(r => r.label === 'Code');
    expect(codeResult?.value).toBe('const x = 1;');
  });

  it('deduplicates candidates — word same as sentence is not repeated', () => {
    const node = makeTextNode('Hello');
    mockCaret(node, 2);
    const results = extractCandidates(0, 0);
    const values = results.map(r => r.value);
    const unique = new Set(values);
    expect(values.length).toBe(unique.size);
  });

  it('extracts paragraph from block-level ancestor', () => {
    const p = document.createElement('p');
    p.textContent = 'First sentence here. Second sentence follows.';
    document.body.appendChild(p);

    const textNode = p.firstChild as Text;
    mockCaret(textNode, 25); // cursor in "Second sentence"

    const results = extractCandidates(0, 0);
    const para = results.find(r => r.label === 'Paragraph');
    // Paragraph is the full element text; sentence is only "Second sentence follows."
    expect(para?.value).toBe('First sentence here. Second sentence follows.');
  });

  it('word extraction handles cursor at start of text', () => {
    const node = makeTextNode('hello world');
    mockCaret(node, 0);
    const results = extractCandidates(0, 0);
    const word = results.find(r => r.label === 'Word');
    expect(word?.value).toBe('hello');
  });

  it('word extraction handles cursor at end of text', () => {
    const node = makeTextNode('hello world');
    mockCaret(node, 11);
    const results = extractCandidates(0, 0);
    const word = results.find(r => r.label === 'Word');
    expect(word?.value).toBe('world');
  });
});
