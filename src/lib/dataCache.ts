/**
 * Cache global en memoria para datos de Supabase.
 * Persiste entre navegaciones de React Router (no se pierde al cambiar de página).
 * Patrón: stale-while-revalidate
 *   - Si hay datos en cache → los muestra INMEDIATAMENTE
 *   - Si los datos tienen < TTL → no re-fetch
 *   - Si los datos tienen > TTL → muestra cache + re-fetch silencioso
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

// TTL: 60 segundos — dentro de este tiempo, los datos se muestran sin fetch
const CACHE_TTL = 60_000;

export function getCachedData<T>(key: string): { data: T | null; isStale: boolean; isFresh: boolean } {
  const entry = cache.get(key);
  if (!entry) return { data: null, isStale: false, isFresh: false };

  const age = Date.now() - entry.timestamp;
  return {
    data: entry.data as T,
    isStale: age > CACHE_TTL,
    isFresh: age <= CACHE_TTL,
  };
}

export function setCachedData<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(key: string): void {
  cache.delete(key);
}

export function invalidateAllCache(): void {
  cache.clear();
}
