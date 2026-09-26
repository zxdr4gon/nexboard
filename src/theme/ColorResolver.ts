import type { SemanticColor, SemanticToken } from '../model/types';
import { DEFAULT_DARK_TOKENS, DEFAULT_LIGHT_TOKENS } from './ThemeTokens';

// Resolves a SemanticColor to a concrete CSS color string for the given
// resolved theme mode. This is the ONLY place that should branch on
// color.mode — spec section 173 mistake #5/#6: don't hardcode theme
// colors into objects, don't blanket-invert literal colors.
export function resolveColor(color: SemanticColor, resolvedMode: 'light' | 'dark'): string {
  switch (color.mode) {
    case 'semantic': {
      const table = resolvedMode === 'light' ? DEFAULT_LIGHT_TOKENS : DEFAULT_DARK_TOKENS;
      return table[color.token];
    }
    case 'literal':
      return color.value;
    case 'adaptive-literal':
      return resolvedMode === 'light' ? color.light : color.dark;
  }
}

export function semanticColor(token: SemanticToken): SemanticColor {
  return { mode: 'semantic', token };
}

export function literalColor(value: string): SemanticColor {
  return { mode: 'literal', value, preserveAcrossThemes: true };
}

export function adaptiveLiteralColor(light: string, dark: string): SemanticColor {
  return { mode: 'adaptive-literal', light, dark };
}
