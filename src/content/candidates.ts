import type { Candidate } from '../types';

export function buildCandidates(extracted: Candidate[]): Candidate[] {
  const all: Candidate[] = [
    { label: 'URL', value: location.href },
    { label: 'Title', value: document.title },
    ...extracted,
  ];

  const seen = new Set<string>();
  const deduped: Candidate[] = [];

  for (const c of all) {
    const v = c.value.trim();
    if (v && !seen.has(v)) {
      seen.add(v);
      deduped.push(c);
    }
  }

  return deduped.slice(0, 10);
}
