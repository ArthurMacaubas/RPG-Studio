'use client';

import { useCallback, useState } from 'react';

// Backs multi-select in the file explorer: click to select one, cmd/ctrl+click
// to toggle, shift+click to select a range (range logic lives in the caller,
// which knows the current sort order).
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectOnly = useCallback((id: string) => setSelected(new Set([id])), []);
  const selectMany = useCallback((ids: string[]) => setSelected(new Set(ids)), []);
  const clear = useCallback(() => setSelected(new Set()), []);

  return { selected, toggle, selectOnly, selectMany, clear, count: selected.size };
}
