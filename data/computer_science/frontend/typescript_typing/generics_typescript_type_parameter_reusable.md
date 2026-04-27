### Generics

Generics create reusable types and functions.

- **Key point** -> Use `<T>` to parameterize types.
- **Key point** -> Preserves type safety across inputs/outputs.
- **Gotcha** -> Overly complex generics reduce readability.

Example:
```ts
function identity<T>(value: T): T { return value; }
```
