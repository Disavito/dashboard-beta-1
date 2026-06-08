import { useState, useCallback, useEffect } from 'react';

export interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, any>;
}

function getStorageKey(pageKey: string): string {
  return `saved-filters-${pageKey}`;
}

function readFilters(pageKey: string): SavedFilter[] {
  try {
    const raw = localStorage.getItem(getStorageKey(pageKey));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeFilters(pageKey: string, filters: SavedFilter[]): void {
  localStorage.setItem(getStorageKey(pageKey), JSON.stringify(filters));
}

export function useSavedFilters(pageKey: string) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() =>
    readFilters(pageKey)
  );

  // Sync state when pageKey changes
  useEffect(() => {
    setSavedFilters(readFilters(pageKey));
  }, [pageKey]);

  const saveFilter = useCallback(
    (name: string, filters: Record<string, any>) => {
      const newFilter: SavedFilter = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()),
        name,
        filters,
      };
      setSavedFilters((prev) => {
        const next = [...prev, newFilter];
        writeFilters(pageKey, next);
        return next;
      });
    },
    [pageKey]
  );

  const deleteFilter = useCallback(
    (id: string) => {
      setSavedFilters((prev) => {
        const next = prev.filter((f) => f.id !== id);
        writeFilters(pageKey, next);
        return next;
      });
    },
    [pageKey]
  );

  const applyFilter = useCallback(
    (id: string): Record<string, any> | undefined => {
      const found = savedFilters.find((f) => f.id === id);
      return found?.filters;
    },
    [savedFilters]
  );

  return { savedFilters, saveFilter, deleteFilter, applyFilter } as const;
}
