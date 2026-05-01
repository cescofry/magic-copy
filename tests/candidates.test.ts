import { describe, it, expect, beforeEach } from 'vitest';
import { buildCandidates } from '../src/content/candidates';
import type { Candidate } from '../src/types';

// jsdom provides location.href and document.title
beforeEach(() => {
  Object.defineProperty(document, 'title', { value: 'Test Page', writable: true, configurable: true });
});

describe('buildCandidates', () => {
  it('always puts URL first and title second', () => {
    const result = buildCandidates([]);
    expect(result[0].label).toBe('URL');
    expect(result[1].label).toBe('Title');
  });

  it('appends extracted candidates after URL and title', () => {
    const extracted: Candidate[] = [
      { label: 'Word', value: 'hello' },
      { label: 'Sentence', value: 'Hello world.' },
    ];
    const result = buildCandidates(extracted);
    expect(result[2].value).toBe('hello');
    expect(result[3].value).toBe('Hello world.');
  });

  it('deduplicates exact-match values', () => {
    // If URL === some extracted value, it should appear once
    const extracted: Candidate[] = [
      { label: 'Word', value: location.href },
    ];
    const result = buildCandidates(extracted);
    const urlCount = result.filter(c => c.value === location.href).length;
    expect(urlCount).toBe(1);
  });

  it('deduplicates title if it appears in extracted list', () => {
    const extracted: Candidate[] = [
      { label: 'Paragraph', value: 'Test Page' },
    ];
    const result = buildCandidates(extracted);
    const titleCount = result.filter(c => c.value === 'Test Page').length;
    expect(titleCount).toBe(1);
  });

  it('caps list at 10 items', () => {
    const extracted: Candidate[] = Array.from({ length: 20 }, (_, i) => ({
      label: 'X',
      value: `value-${i}`,
    }));
    const result = buildCandidates(extracted);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('filters out empty values', () => {
    const extracted: Candidate[] = [{ label: 'Empty', value: '' }];
    const result = buildCandidates(extracted);
    expect(result.every(c => c.value.trim().length > 0)).toBe(true);
  });

  it('filters out whitespace-only values', () => {
    const extracted: Candidate[] = [{ label: 'Blank', value: '   ' }];
    const result = buildCandidates(extracted);
    expect(result.every(c => c.value.trim().length > 0)).toBe(true);
  });
});
