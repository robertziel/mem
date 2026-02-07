### Form Semantics

Semantic form elements improve accessibility and browser behavior.

- **Key point** -> Use `<label>` with `for` to connect fields.
- **Key point** -> Use correct input `type` for validation.
- **Gotcha** -> Missing labels hurt screen reader usability.

Example:
```html
<label for="email">Email</label>
<input id="email" type="email" required>
```
