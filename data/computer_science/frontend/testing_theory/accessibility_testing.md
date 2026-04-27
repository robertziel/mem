### Accessibility Testing

Accessibility testing ensures UI works for keyboard, screen readers, and contrast.

- **Key point** -> Test keyboard flow and focus order.
- **Key point** -> Use automated checks for common issues.
- **Gotcha** -> Automation doesn’t catch all a11y problems.

Example:
```js
import { axe, toHaveNoViolations } from "jest-axe";
expect(await axe(container)).toHaveNoViolations();
```
