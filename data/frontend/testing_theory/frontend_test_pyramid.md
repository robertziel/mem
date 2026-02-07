### Test Pyramid

The test pyramid suggests many unit tests, fewer integration tests, and few E2E tests.

- **Key point** -> Optimize for speed and confidence.
- **Key point** -> Integration tests catch boundary issues.
- **Gotcha** -> Skipping unit tests increases E2E burden.

Example:
```text
Unit (many) -> Integration (some) -> E2E (few)
```
