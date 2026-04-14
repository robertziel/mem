### SSR vs SPA and Hydration

SSR renders HTML on the server for fast first paint; SPA renders on the client; hydration attaches JS behavior to SSR HTML.

- **Key point** -> SSR improves initial load and SEO.
- **Key point** -> SPA can be faster after initial load.
- **Gotcha** -> Hydration cost grows with component complexity.

Example:
```js
// Client hydration
hydrateRoot(document.getElementById("app"), <App />);
```
