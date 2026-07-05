"use client";

import { useState, useEffect } from "react";
import { readGlobal, writeGlobal } from "@/lib/storage/local-store";

/**
 * Like useState, but reads the initial value from localStorage and writes on
 * every change. Also returns a `clear` function that resets to the default.
 *
 * The `key` must be stable (don't pass dynamic strings per render).
 */
export function usePersistentFilter<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void, () => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    const stored = readGlobal<T>(key);
    if (stored !== null) setValue(stored);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function set(newValue: T) {
    setValue(newValue);
    writeGlobal(key, newValue);
  }

  function clear() {
    setValue(defaultValue);
    writeGlobal(key, defaultValue);
  }

  return [value, set, clear];
}
