### Caching

Caching stores resources to avoid re-downloading.

- **Key point** -> Use long cache headers for hashed assets.
- **Key point** -> Use `stale-while-revalidate` for APIs.
- **Gotcha** -> Cache busting is required for changes.

Example:
```http
Cache-Control: public, max-age=31536000, immutable
```
