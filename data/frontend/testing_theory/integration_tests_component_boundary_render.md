### Integration Tests

Integration tests verify interactions between multiple units or services.

- **Key point** -> Validate boundaries (API, DB, components).
- **Key point** -> Slower than unit tests but more realistic.
- **Gotcha** -> If too many, the suite becomes slow.

Example:
```js
render(<App />);
expect(screen.getByText("Welcome")).toBeInTheDocument();
```
