### Type Inference

TypeScript infers types from values and usage.

- **Key point** -> Explicit types are optional in many cases.
- **Key point** -> Inference flows through functions.
- **Gotcha** -> Inference can be too wide without `as const`.

Example:
```ts
const status = "ok"; // string, not "ok"
const status2 = "ok" as const; // "ok"
```
