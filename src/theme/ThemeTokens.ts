import type { SemanticToken } from '../model/types';

// Default resolved values for each semantic token, per theme mode.
// These are defaults, not the document's own theme.semanticColors
// overrides (spec section 13.6) — Document-level overrides are wired
// in a later phase once projects can customize their palette.
export const DEFAULT_LIGHT_TOKENS: Record<SemanticToken, string> = {
  'ink-primary': '#14141a',
  'ink-secondary': '#3c3c46',
  'ink-muted': '#7a7a85',
  accent: '#3860ff',
  selection: '#3860ff',
  highlighter: '#ffe066',
  background: '#fafafa',
  'grid-major': '#d3d3da',
  'grid-minor': '#e7e7ec',
};

export const DEFAULT_DARK_TOKENS: Record<SemanticToken, string> = {
  'ink-primary': '#f2f2f5',
  'ink-secondary': '#c7c7d1',
  'ink-muted': '#84848f',
  accent: '#7c9bff',
  selection: '#7c9bff',
  highlighter: '#7a6a1f',
  background: '#15151a',
  'grid-major': '#2c2c35',
  'grid-minor': '#1f1f26',
};
