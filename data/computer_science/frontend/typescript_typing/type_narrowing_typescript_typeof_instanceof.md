### Type Narrowing

Narrowing refines a union type to a more specific type.

- **Key point** -> Use `typeof`, `in`, `instanceof`, or discriminants.
- **Key point** -> Guards improve safety.
- **Gotcha** -> `as` casting skips safety.

Example:
```ts
if (typeof x === "string") x.toUpperCase();
```
