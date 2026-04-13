### Virtualization

Virtualization renders only visible items in large lists.

- **Key point** -> Reduces DOM size and layout cost.
- **Key point** -> Keeps scrolling smooth.
- **Gotcha** -> Requires fixed/estimated row heights.

Example:
```jsx
<FixedSizeList height={400} itemCount={1000} itemSize={40} />
```
