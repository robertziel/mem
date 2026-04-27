### Debounce vs Throttle

Debounce delays until input stops; throttle limits to a fixed rate.

- **Key point** -> Debounce for search, resize end.
- **Key point** -> Throttle for scroll/drag.
- **Gotcha** -> Over-throttling can feel laggy.

Example:
```js
const onScroll = throttle(() => update(), 100);
```
