### Load vs Require vs Include vs Extend (short)

- **`load`**: loads a file every time it’s called.
- **`require`**: loads a file once.
- **`include`**: adds module methods as **instance methods**.
- **`extend`**: adds module methods as **class methods**.

**Rule of thumb:** `require` for libraries, `include` for instance behavior.
