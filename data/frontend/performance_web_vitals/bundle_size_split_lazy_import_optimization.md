### Bundle Size

Bundle size affects load time, parse time, and interactivity.

- **Key point** -> Split bundles by route or feature.
- **Key point** -> Remove unused deps.
- **Gotcha** -> Many small chunks can increase request overhead.

Example:
```js
const Page = lazy(() => import("./Page"));
```
