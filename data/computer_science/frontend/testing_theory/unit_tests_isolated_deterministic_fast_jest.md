### Unit Tests

Unit tests validate a small unit of logic in isolation.

- **Key point** -> Fast, focused, and deterministic.
- **Key point** -> Avoid network/DB in unit tests.
- **Gotcha** -> Too many mocks can make tests fragile.

Example:
```js
expect(sum(2, 3)).toBe(5);
```
