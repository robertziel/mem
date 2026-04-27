### Mocking vs Stubbing

Mocks verify behavior; stubs provide canned responses.

- **Key point** -> Use stubs to isolate dependencies.
- **Key point** -> Use mocks to assert interactions.
- **Gotcha** -> Over-mocking can hide integration bugs.

Example:
```js
const api = { fetch: jest.fn().mockResolvedValue({}) }; // mock
```
