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
  // jsdom does not implement Range.getBoundingClientRect; return height:0 so extractLine
  // falls back to returning the full text-node content.
  Range.prototype.getBoundingClientRect = vi.fn().mockReturnValue(
    { top: 0, height: 0, left: 0, right: 0, bottom: 0, width: 0 }
  );
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

  it('extracts Line using visual bounding rects — cursor on first of two lines', () => {
    // 'Hello world foo': chars 0–11 are on line 1 (top: 0), chars 12+ are on line 2 (top: 20)
    Range.prototype.getBoundingClientRect = vi.fn().mockImplementation(function (this: Range) {
      return (this.startOffset < 12)
        ? { top: 0, height: 16, left: 0, right: 0, bottom: 16, width: 8 }
        : { top: 20, height: 16, left: 0, right: 0, bottom: 36, width: 8 };
    });

    const node = makeTextNode('Hello world foo');
    mockCaret(node, 7); // cursor inside "world" — on line 1
    const results = extractCandidates(0, 0);
    const line = results.find(r => r.label === 'Line');
    // Line 1 spans chars 0–11 → 'Hello world'
    expect(line?.value).toBe('Hello world');
  });

  it('extracts outer container candidates when ancestor text differs', () => {
    const article = document.createElement('article');
    const h1 = document.createElement('h1');
    h1.textContent = 'Title';
    const p = document.createElement('p');
    p.textContent = 'Body text here.';
    article.appendChild(h1);
    article.appendChild(p);
    document.body.appendChild(article);

    const textNode = p.firstChild as Text;
    mockCaret(textNode, 3);

    const results = extractCandidates(0, 0);
    // Paragraph = 'Body text here.'; article contains both heading + para so its
    // text content differs → should appear as an outer container candidate.
    const labels = results.map(r => r.label);
    expect(labels).toContain('article');
    const articleCandidate = results.find(r => r.label === 'article');
    expect(articleCandidate?.value).toContain('Body text here.');
  });
});
