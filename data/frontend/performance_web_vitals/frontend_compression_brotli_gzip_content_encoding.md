### Compression

Compression reduces asset size over the network.

- **Key point** -> Use Brotli or gzip for text assets.
- **Key point** -> Pre-compress static files.
- **Gotcha** -> Don’t compress already-compressed images.

Example:
```http
Content-Encoding: br
```
