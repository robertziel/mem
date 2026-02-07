### Code Splitting

Code splitting loads only the JS needed for a route or feature.

- **Key point** -> Improves LCP and TTI.
- **Key point** -> Use dynamic imports.
- **Gotcha** -> Too many chunks can hurt caching.

Example:
```js
const Settings = () => import("./Settings");
```
