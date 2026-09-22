/**
 * A minimal change-gated store.
 *
 * The whole point: the game simulation runs at 60 Hz, but React must not
 * re-render 60 times a second. `set` compares each key with Object.is and only
 * notifies listeners when something that is actually *displayed* changed. Live
 * cockpit instruments are painted imperatively on a 2D canvas instead, so they
 * never touch React at all.
 */

export type Listener<T> = (value: T) => void;

export class Store<T extends object> {
  private value: T;
  private listeners = new Set<Listener<T>>();
  private pendingMicrotask = false;

  constructor(initial: T) {
    this.value = initial;
  }

  get(): T {
    return this.value;
  }

  /** Subscribe immediately (listener is invoked with the current value). */
  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    listener(this.value);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Merge a partial patch. Notifies only if at least one field really changed.
   * Returns true when listeners were notified.
   */
  set(patch: Partial<T>): boolean {
    let changed = false;
    for (const key of Object.keys(patch) as (keyof T)[]) {
      const next = patch[key];
      if (next === undefined) continue;
      if (!Object.is(this.value[key], next)) {
        changed = true;
        break;
      }
    }
    if (!changed) return false;

    this.value = { ...this.value, ...patch };
    const snapshot = this.value;
    // Defer to a microtask so multiple synchronous `set` calls in one frame
    // collapse into a single React update.
    if (!this.pendingMicrotask) {
      this.pendingMicrotask = true;
      queueMicrotask(() => {
        this.pendingMicrotask = false;
        for (const listener of this.listeners) listener(snapshot);
      });
    }
    return true;
  }
}
