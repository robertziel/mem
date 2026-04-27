### CI

Continuous Integration runs tests and checks on every change.

- **Key point** -> Prevents broken builds from merging.
- **Key point** -> Automates quality gates.
- **Gotcha** -> Slow CI pipelines reduce developer velocity.

Example:
```text
push -> CI -> tests/lint/build
```
