### Hydration

Hydration attaches JS behavior to server-rendered HTML.

- **Key point** -> Enables interactivity without full re-render.
- **Key point** -> Faster first paint with SSR + hydration.
- **Gotcha** -> Heavy hydration cost can slow interactivity.

Example:
```js
hydrateRoot(document.getElementById("app"), <App />);
```
