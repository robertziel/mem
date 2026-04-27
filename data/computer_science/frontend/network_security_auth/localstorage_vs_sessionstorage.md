### localStorage vs sessionStorage

Both store key/value data in the browser, but differ in lifetime.

- **Key point** -> localStorage persists; sessionStorage clears per tab.
- **Key point** -> Both are accessible to JS (XSS risk).
- **Gotcha** -> Storage is synchronous and can block main thread.

Example:
```js
localStorage.setItem("theme", "dark");
```
