### Closure

A closure is a function plus the lexical environment it was created in.

- **Key point** -> It can access outer variables after the outer returns.
- **Key point** -> Useful for encapsulation and factories.
- **Gotcha** -> Closures can keep memory alive longer than expected.

Example:
```js
function makeCounter(){
  let n = 0;
  return () => ++n;
}
const inc = makeCounter();
inc(); // 1
```
