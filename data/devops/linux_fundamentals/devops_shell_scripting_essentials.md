### Shell Scripting Essentials (Bash)

**Shebang and basics:**
```bash
#!/usr/bin/env bash
set -euo pipefail  # exit on error, undefined vars, pipe failures
```

**Variables and strings:**
```bash
NAME="world"
echo "Hello ${NAME}"       # double quotes: variable expansion
echo 'Hello ${NAME}'       # single quotes: literal
RESULT=$(command)           # command substitution
DEFAULT=${VAR:-fallback}    # default value if unset
```

**Conditionals:**
```bash
if [[ -f /path/file ]]; then    # file exists
if [[ -d /path/dir ]]; then     # directory exists
if [[ -z "$VAR" ]]; then        # string is empty
if [[ "$A" == "$B" ]]; then     # string equality
if [[ $NUM -gt 10 ]]; then      # numeric comparison
```

**Loops:**
```bash
for f in *.log; do echo "$f"; done
for i in {1..10}; do echo "$i"; done
while read -r line; do echo "$line"; done < file.txt
```

**Functions:**
```bash
deploy() {
  local env="$1"
  echo "Deploying to ${env}"
  return 0
}
deploy production
```

**Text processing essentials:**
- `grep -r "pattern" dir/` - search recursively
- `awk '{print $2}' file` - print second column
- `sed 's/old/new/g' file` - find and replace
- `cut -d: -f1 /etc/passwd` - extract fields
- `sort | uniq -c | sort -rn` - count and rank
- `jq '.key'` - parse JSON
- `xargs` - build commands from stdin

**Useful patterns:**
```bash
# Check if command exists
command -v docker &>/dev/null || { echo "docker not found"; exit 1; }

# Retry loop
for i in {1..5}; do
  command && break || sleep $((i * 2))
done

# Trap for cleanup
trap 'rm -f /tmp/lockfile' EXIT
```

**Rule of thumb:** Always use `set -euo pipefail`, quote your variables, use `[[ ]]` over `[ ]`, and use `shellcheck` to lint.
