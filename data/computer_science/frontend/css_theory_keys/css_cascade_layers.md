### CSS Cascade Layers

Cascade layers let you group CSS into ordered buckets with `@layer`.

- **Key point** -> Layer order decides which group of styles wins.
- **Key point** -> Specificity still matters inside the same layer.
- **Key point** -> Useful for resets, base styles, components, utilities, and third-party CSS.

Quick cheat sheet:

- `@layer base;` -> declares a layer
- `@layer base { ... }` -> puts rules inside a layer
- `@layer reset, base, components, utilities;` -> defines layer order
- Later layers beat earlier layers
- Unlayered author CSS beats layered author CSS

Example:
```css
@layer reset, base, utilities;

@layer base {
  button { color: black; }
}

@layer utilities {
  .text-red { color: red; }
}
```

If both rules match, `.text-red` wins because `utilities` comes after `base`.

**Rule of thumb:** Use layers to control precedence between style groups, and use specificity to resolve conflicts inside one group.
