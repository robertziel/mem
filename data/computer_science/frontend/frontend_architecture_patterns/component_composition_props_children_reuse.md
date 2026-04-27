### Component Composition

Composition builds UIs by combining smaller components.

- **Key point** -> Encourages reuse and separation of concerns.
- **Key point** -> Props flow down, events bubble up.
- **Gotcha** -> Over-abstraction can make components hard to follow.

Example:
```jsx
<Card>
  <CardHeader title="Profile" />
  <CardBody>...</CardBody>
</Card>
```
