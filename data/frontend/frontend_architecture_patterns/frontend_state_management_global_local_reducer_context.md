### State Management

State management organizes application data and updates predictably.

- **Key point** -> Local state for UI, global for shared data.
- **Key point** -> Predictable updates reduce bugs.
- **Gotcha** -> Global state can become a dumping ground.

Example:
```js
const [state, dispatch] = useReducer(reducer, initial);
```
