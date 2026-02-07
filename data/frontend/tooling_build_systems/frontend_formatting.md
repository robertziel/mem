### Formatting

Formatters enforce consistent code style automatically.

- **Key point** -> Run on save or pre-commit.
- **Key point** -> Reduces style discussions in reviews.
- **Gotcha** -> Conflicts if formatter and linter rules clash.

Example:
```bash
prettier --write "src/**/*.{js,ts,css}" 
```
