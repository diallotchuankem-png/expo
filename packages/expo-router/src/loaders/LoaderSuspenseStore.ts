type SuspenseEntry = { data: unknown } | { error: unknown } | Promise<unknown>;

/**
 * Per-mount store of loader reads, keyed by resolved URL. Holding the settled value (or in-flight
 * promise) lets a re-render read the result instead of re-fetching. Entries are ref-counted and
 * reclaimed once the last mounted reader releases the key, so they stay short-lived.
 */
export class LoaderSuspenseStore {
  private entries = new Map<string, SuspenseEntry>();
  private refCounts = new Map<string, number>();
  private reclaimable = new Set<string>();

  get<T = unknown>(key: string): { data: T } | { error: unknown } | Promise<T> | undefined {
    return this.entries.get(key) as { data: T } | { error: unknown } | Promise<T> | undefined;
  }

  set(key: string, entry: SuspenseEntry) {
    this.reclaimable.delete(key);
    this.entries.set(key, entry);
  }

  /** Set server-injected data if the key has no entry yet. */
  seed(key: string, data: unknown) {
    if (!this.entries.has(key)) {
      this.set(key, { data });
    }
  }

  clear(key: string) {
    this.reclaimable.delete(key);
    this.entries.delete(key);
  }

  /**
   * Remove a settled error after the current render pass: replayed reads re-throw it, while an
   * error boundary's retry refetches.
   */
  expireError(key: string) {
    const entry = this.entries.get(key);
    if (!entry) {
      return;
    }
    queueMicrotask(() => {
      if (this.entries.get(key) === entry) {
        this.clear(key);
      }
    });
  }

  retain(key: string) {
    this.refCounts.set(key, (this.refCounts.get(key) ?? 0) + 1);
    this.reclaimable.delete(key);
  }

  release(key: string) {
    const next = (this.refCounts.get(key) ?? 1) - 1;
    if (next > 0) {
      this.refCounts.set(key, next);
      return;
    }

    this.refCounts.delete(key);
    this.reclaimable.add(key);
    // Defer so an unmount + remount (Strict Mode, fast navigation) doesn't drop a live entry.
    queueMicrotask(() => {
      if (this.reclaimable.delete(key)) {
        this.entries.delete(key);
      }
    });
  }

  // Refcounts survive a reset: mounted readers don't re-run their retain effects afterwards.
  reset() {
    this.entries.clear();
    this.reclaimable.clear();
  }
}
