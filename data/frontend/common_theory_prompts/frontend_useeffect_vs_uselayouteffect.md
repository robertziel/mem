### useEffect vs useLayoutEffect

useEffect runs after paint; useLayoutEffect runs synchronously before paint.

- **Key point** -> useLayoutEffect is for measuring DOM before the browser paints.
- **Key point** -> useEffect is preferred for non-visual side effects.
- **Gotcha** -> useLayoutEffect can block painting and cause jank.

Example:
```js
useLayoutEffect(() => {
  const w = ref.current.getBoundingClientRect().width;
  setWidth(w);
}, []);
```
