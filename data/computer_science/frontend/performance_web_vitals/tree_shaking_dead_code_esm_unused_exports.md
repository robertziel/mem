### Tree Shaking

Tree shaking removes unused exports from the final JS bundle.

- **Key point** -> Works best with ES modules (static imports/exports).
- **Key point** -> Smaller bundles improve load performance.
- **Gotcha** -> Side-effectful modules can prevent removal.

Example:
```js
import { used } from "./lib"; // unused exports dropped
```
