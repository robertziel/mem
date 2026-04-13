### async/await

`async` functions return Promises; `await` pauses within them.

- **Key point** -> `await` unwraps a Promise result or throws on reject.
- **Key point** -> Use try/catch for errors.
- **Gotcha** -> `await` in loops can serialize work.

Example:
```js
async function load(){
  try { const r = await fetch("/api"); return r.json(); }
  catch (e) { return null; }
}
```
