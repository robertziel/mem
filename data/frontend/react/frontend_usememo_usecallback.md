### useMemo vs useCallback

`useMemo` memoizes values; `useCallback` memoizes functions.

- **Key point** -> Use to avoid expensive recalculations or re-renders.
- **Key point** -> Both depend on dependency arrays.
- **Gotcha** -> Wrong deps cause stale values.

Example:
```jsx
const filtered = useMemo(() => items.filter(f), [items]);
const onClick = useCallback(() => save(id), [id]);
```
