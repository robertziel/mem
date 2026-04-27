### DOM

The DOM is the in-memory tree representation of the HTML document.

- **Key point** -> JS reads and mutates the DOM to change the UI.
- **Key point** -> DOM + CSSOM produce the render tree.
- **Gotcha** -> Large DOMs increase layout and memory cost.

Example:
```html
<ul id="list"><li>One</li></ul>
<script>
  document.querySelector("#list").insertAdjacentHTML("beforeend", "<li>Two</li>");
</script>
```
