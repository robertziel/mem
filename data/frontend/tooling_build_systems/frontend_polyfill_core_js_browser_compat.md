### Polyfill

Polyfills add missing APIs in older environments.

- **Key point** -> Use only for missing features.
- **Key point** -> Load conditionally when possible.
- **Gotcha** -> Too many polyfills bloat bundles.

Example:
```js
import "core-js/es/promise";
```
