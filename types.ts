
export interface ScripturePassage {
  source: string;
  originalText: string;
  context: string;
  sanskritTerm?: string;
}

export interface ComparisonResult {
  theme: string;
  christian: ScripturePassage;
  vedic: ScripturePassage;
  synthesis: string;
}
