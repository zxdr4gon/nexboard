import type { SemanticColor, ThemeMode } from '../model/types';
import { resolveColor } from './ColorResolver';

type Listener = (resolvedMode: 'light' | 'dark') => void;

const STORAGE_KEY = 'whiteboard.theme-mode';

// Implements the ThemeManager contract (spec section 180.5). Handles the
// 'system' mode by watching prefers-color-scheme, and applies
// data-theme to <html> so CSS custom properties (styles/tokens.css)
// stay in sync with canvas semantic-color resolution — one source of
// truth for "what does dark mode look like" for both UI chrome and
// drawn content.
export class ThemeManager {
  private mode: ThemeMode;
  private listeners = new Set<Listener>();
  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    this.mode = stored ?? 'system';
    this.mediaQuery.addEventListener('change', () => {
      if (this.mode === 'system') this.notify();
    });
  }

  init(): void {
    document.documentElement.setAttribute('data-theme', this.getResolvedMode());
  }

  getMode(): ThemeMode {
    return this.mode;
  }

  getResolvedMode(): 'light' | 'dark' {
    if (this.mode === 'system') {
      return this.mediaQuery.matches ? 'dark' : 'light';
    }
    return this.mode;
  }

  setMode(mode: ThemeMode): void {
    this.mode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.setAttribute('data-theme', this.getResolvedMode());
    this.notify();
  }

  resolveColor(color: SemanticColor): string {
    return resolveColor(color, this.getResolvedMode());
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const resolved = this.getResolvedMode();
    for (const listener of this.listeners) listener(resolved);
  }
}
