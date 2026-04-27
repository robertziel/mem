### Rails Security: Brakeman (Static Analysis)

```bash
gem install brakeman
brakeman                    # scan entire Rails app
brakeman -o report.html     # HTML report
brakeman -w2                # only medium+ severity
brakeman --no-pager         # CI-friendly
```

**Common Brakeman warnings:**
| Warning | What it catches |
|---------|----------------|
| SQL Injection | String interpolation in `where()` |
| Cross-Site Scripting | `raw()`, `html_safe` with user input |
| Mass Assignment | Missing strong parameters |
| Open Redirect | `redirect_to params[:url]` |
| File Access | User input in file paths |
| Command Injection | User input in `system()` |

**CI integration:**
```yaml
# GitHub Actions
- run: |
    gem install brakeman
    brakeman --no-pager -w2 --exit-on-warn
```

**Rule of thumb:** Run Brakeman in CI on every PR. Fix all high-severity warnings. Treat Brakeman like a linter — it catches security issues before they reach production.
