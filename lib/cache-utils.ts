// Simple in-memory cache to reduce API calls
type CacheEntry<T> = {
  value: T;
  timestamp: number;
};

class SimpleCache {
  private cache: Record<string, CacheEntry<any>> = {};
  private readonly DEFAULT_TTL = 1000 * 60 * 60; // 1 hour in milliseconds

  get<T>(key: string): T | null {
    const entry = this.cache[key];
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.DEFAULT_TTL) {
      // Entry has expired
      delete this.cache[key];
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    this.cache[key] = {
      value,
      timestamp: Date.now(),
    };
  }

  clear(): void {
    this.cache = {};
  }
}

// Create a singleton instance
export const cache = new SimpleCache();
