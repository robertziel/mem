### HTML5 `img` `srcset` (short)

`srcset` lets the browser choose the best image based on screen size or density.

```html
<img
  src="small.jpg"
  srcset="small.jpg 1x, large.jpg 2x"
  alt="Example"
/>
```

**Rule of thumb:** provide multiple sizes to save bandwidth on small screens.
