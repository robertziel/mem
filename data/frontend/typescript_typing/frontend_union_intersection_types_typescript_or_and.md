### Union vs Intersection Types

Union types allow one of many types; intersection combines types.

- **Key point** -> Union: `A | B` means either.
- **Key point** -> Intersection: `A & B` means both.
- **Gotcha** -> Intersections can create impossible types.

Example:
```ts
type A = { a: string };
type B = { b: number };
type U = A | B;
type I = A & B; // must have both a and b
```
