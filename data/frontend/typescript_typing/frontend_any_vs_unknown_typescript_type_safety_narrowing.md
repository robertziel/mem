### any vs unknown

`any` disables type checking; `unknown` forces narrowing.

- **Key point** -> Prefer `unknown` for safety.
- **Key point** -> `any` spreads unsafe types.
- **Gotcha** -> `unknown` requires checks before use.

Example:
```ts
const value: unknown = JSON.parse(s);
if (typeof value === "string") value.toUpperCase();
```
