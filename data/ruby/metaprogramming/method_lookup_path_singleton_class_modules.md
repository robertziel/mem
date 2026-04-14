### Ruby method lookup path

When Ruby resolves a method call, it searches in this order:

1. Singleton class (eigenclass) of the object
2. Prepended modules
3. The object's class
4. Included modules, with the last included checked first
5. Superclass chain, repeating the same pattern
6. `BasicObject`

### Why it matters

- Singleton methods beat normal instance methods.
- `prepend` can override methods before the class itself.
- Include order matters when multiple modules define the same method.

**Rule of thumb:** If a method call is surprising, inspect the ancestor chain and check for singleton methods or prepended modules first.
