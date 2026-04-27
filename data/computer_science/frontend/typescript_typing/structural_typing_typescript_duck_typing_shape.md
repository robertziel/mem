### Structural Typing

TypeScript uses structural typing: compatibility is based on shape.

- **Key point** -> Extra properties are allowed in assignments.
- **Key point** -> Interfaces are compatible if shapes match.
- **Gotcha** -> Excess property checks apply on object literals.

Example:
```ts
type A = { x: number };
const a: A = { x: 1, y: 2 }; // ok (unless literal check)
```
