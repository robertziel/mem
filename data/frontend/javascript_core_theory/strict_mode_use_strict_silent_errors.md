### Strict Mode

Strict mode is a safer JS subset that prevents silent errors.

- **Key point** -> Use via `"use strict"`.
- **Key point** -> `this` is undefined in non-method calls.
- **Gotcha** -> Some sloppy patterns break (e.g., duplicate params).

Example:
```js
"use strict";
function f(){ return this; }
f(); // undefined
```
