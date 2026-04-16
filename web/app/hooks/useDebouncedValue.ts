import { useEffect, useState } from 'react';

/**
 * Return a debounced mirror of `value`. The mirror is updated only after
 * `delay` ms have elapsed since the last change to `value`. Rapid
 * successive changes collapse to the most recent one. The initial value
 * is returned synchronously on mount.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}
