### E2E Tests

End-to-end tests validate full user flows across the real system.

- **Key point** -> High confidence, slower and more brittle.
- **Key point** -> Cover critical paths (login, checkout).
- **Gotcha** -> Flaky tests often come from async timing.

Example:
```js
await page.goto("/login");
await page.fill("#email", "a@b.com");
await page.click("button[type=submit]");
```
