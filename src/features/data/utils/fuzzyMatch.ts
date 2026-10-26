export interface FuzzyMatch {
  column: string;
  placeholder: string;
  confidence: 'exact' | 'normalized' | 'substring';
}

export interface FuzzyMatchResult {
  matched: FuzzyMatch[];
  unmatchedColumns: string[];
  unmatchedPlaceholders: string[];
}

export function normalizeForMatch(s: string): string {
  return s.toLowerCase().trim().replace(/[\s_-]+/g, '');
}

export function fuzzyMatchColumns(columns: string[], placeholderNames: string[]): FuzzyMatchResult {
  const matched: FuzzyMatch[] = [];
  let remainCols = [...columns];
  let remainPhs = [...placeholderNames];

  for (const col of [...remainCols]) {
    const ph = remainPhs.find(p => p === col);
    if (ph) {
      matched.push({ column: col, placeholder: ph, confidence: 'exact' });
      remainCols = remainCols.filter(c => c !== col);
      remainPhs = remainPhs.filter(p => p !== ph);
    }
  }

  for (const col of [...remainCols]) {
    const nc = normalizeForMatch(col);
    const ph = remainPhs.find(p => normalizeForMatch(p) === nc);
    if (ph) {
      matched.push({ column: col, placeholder: ph, confidence: 'normalized' });
      remainCols = remainCols.filter(c => c !== col);
      remainPhs = remainPhs.filter(p => p !== ph);
    }
  }

  for (const col of [...remainCols]) {
    const nc = normalizeForMatch(col);
    const ph = remainPhs.find(p => { const np = normalizeForMatch(p); return nc.includes(np) || np.includes(nc); });
    if (ph) {
      matched.push({ column: col, placeholder: ph, confidence: 'substring' });
      remainCols = remainCols.filter(c => c !== col);
      remainPhs = remainPhs.filter(p => p !== ph);
    }
  }

  return { matched, unmatchedColumns: remainCols, unmatchedPlaceholders: remainPhs };
}
