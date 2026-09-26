type Listener<T> = (value: T) => void;

// Minimal observable value — enough for the toolbar/theme-button UI to
// react to state changes without pulling in a state-management library.
export class ObservableValue<T> {
  private listeners = new Set<Listener<T>>();

  constructor(private value: T) {}

  get(): T {
    return this.value;
  }

  set(value: T): void {
    this.value = value;
    for (const listener of this.listeners) listener(value);
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
