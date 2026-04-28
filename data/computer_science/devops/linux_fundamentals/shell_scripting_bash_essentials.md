### Shell Scripting Essentials (Bash)

**Always-on header — the only safe default:**

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'        # safer word-splitting (no spaces)
```

| Flag | Effect |
|---|---|
| `-e` (`errexit`) | Exit on any command failing — but watch out for pipes (`pipefail` needed) |
| `-u` (`nounset`) | Exit on use of undefined variable |
| `-o pipefail` | Pipeline returns first non-zero, not just last |
| `-x` (`xtrace`) | Print every command (debug only) |
| `IFS=$'\n\t'` | Stop spaces from splitting words during expansion |

**Variables and strings:**

| Pattern | Effect |
|---|---|
| `name=value` (no spaces!) | Assignment |
| `"$var"` | Expand with quoting (use this) |
| `'$var'` | Literal — no expansion |
| `${var}_suffix` | Disambiguate end of name |
| `$(cmd)` | Command substitution |
| `\`cmd\`` | Old-style — avoid |
| `${var:-default}` | Use `default` if unset/empty |
| `${var:=default}` | Same, but also assign |
| `${var:?error}` | Error and exit if unset |
| `${var:+alt}` | `alt` if set, else empty |
| `${#var}` | Length |
| `${var#prefix}` / `${var%suffix}` | Strip prefix / suffix (shortest match) |
| `${var##prefix}` / `${var%%suffix}` | Strip (longest match) |
| `${var/foo/bar}` / `${var//foo/bar}` | Replace first / all |
| `${var^^}` / `${var,,}` | Upper / lower case (Bash 4+) |

**Quoting rules — the source of 80% of bash bugs:**

| Without quotes | With `"$var"` |
|---|---|
| Word splitting on spaces | Single argument preserved |
| Glob expansion (`*` → file list) | Literal `*` |
| Empty arguments collapse | Empty string passed |
| `if [ $var = x ]` breaks if `$var` is empty | `if [[ "$var" = x ]]` works |

> **Always quote**: `"$var"`, `"$@"`, `"$(cmd)"`. Unquoted = likely bug.

**Test forms — `[[ ]]` over `[ ]`:**

| Form | Notes |
|---|---|
| `[[ -f path ]]` | Regular file exists |
| `[[ -d path ]]` | Directory exists |
| `[[ -e path ]]` | Anything exists |
| `[[ -L path ]]` | Symlink |
| `[[ -r path ]]` / `-w` / `-x` | Readable / writable / executable |
| `[[ -s path ]]` | Exists + non-empty |
| `[[ -z "$s" ]]` | Empty string |
| `[[ -n "$s" ]]` | Non-empty string |
| `[[ "$a" == "$b" ]]` | String equal |
| `[[ "$a" != "$b" ]]` | String not equal |
| `[[ "$a" =~ regex ]]` | Bash regex match |
| `[[ $n -eq 0 ]]` / `-ne` / `-gt` / `-lt` / `-ge` / `-le` | Numeric comparison |
| `[[ -v var ]]` | Var is set (Bash 4.2+) |
| `[[ a && b ]]` / `[[ a \|\| b ]]` | Logical AND / OR |
| `(( n > 0 ))` | Arithmetic context — no `$`, no quotes |

**Conditionals:**

```bash
if [[ -f "$file" ]]; then
  echo "exists"
elif [[ -d "$file" ]]; then
  echo "is dir"
else
  echo "missing"
fi

case "$1" in
  start|up)   start ;;
  stop|down)  stop ;;
  *)          echo "usage: $0 {start|stop}"; exit 1 ;;
esac
```

**Loops:**

| Form | Use |
|---|---|
| `for f in *.log; do …; done` | Glob iteration |
| `for i in {1..10}; do …; done` | Range |
| `for i in $(seq 1 10); do …; done` | Same, less efficient |
| `for arg in "$@"; do …; done` | Iterate script args |
| `while read -r line; do …; done < file` | Read file line-by-line |
| `while IFS=, read -r a b c; do …; done < csv` | Read CSV-ish |
| `until cond; do …; done` | Loop until true |

**Reading files / streams safely:**

```bash
while IFS= read -r line; do
  echo "[$line]"
done < input.txt
```

| Trick | Why |
|---|---|
| `IFS=` | Don't trim leading/trailing whitespace |
| `read -r` | Don't process backslashes |
| `< file` (redirect, not pipe) | Avoid subshell that hides variable changes |

**Functions:**

```bash
greet() {
  local name="$1"            # always declare locals
  local greeting="${2:-Hi}"
  echo "${greeting}, ${name}"
  return 0
}

greet "Alice" "Hello"
```

| Concept | Detail |
|---|---|
| `local` | Variable scoped to function |
| `return N` | Exit code (0–255) — not return value |
| Output | Print to stdout; capture via `$(func args)` |
| Args | `$1 $2 ...`, `$#`, `"$@"`, `"$*"` |
| `"$@"` vs `"$*"` | Quoted `"$@"` preserves args; `"$*"` joins with first IFS char |

**Arrays (Bash 4+):**

| Form | Effect |
|---|---|
| `arr=(a b c)` | Declare |
| `arr+=(d)` | Append |
| `${arr[0]}` | Index |
| `${arr[@]}` | All elements |
| `"${arr[@]}"` | All, quoted (preserves spaces) |
| `${#arr[@]}` | Length |
| `${arr[*]}` | All, joined by IFS |
| `for x in "${arr[@]}"` | Iterate safely |

**Associative arrays (Bash 4+):**

```bash
declare -A counts
counts[apple]=3
counts[banana]=7
for k in "${!counts[@]}"; do
  echo "$k=${counts[$k]}"
done
```

**Process control — exit codes, traps:**

| Pattern | Use |
|---|---|
| `cmd && fallback` | Run fallback only on success — wait, that's wrong: `cmd && next` runs `next` only if `cmd` succeeded |
| `cmd \|\| die "msg"` | Exit if `cmd` failed |
| `cmd && cmd2` (success chain) | Sequential |
| `(cmd1; cmd2)` | Subshell |
| `{ cmd1; cmd2; }` | Group in current shell |
| `cmd &` | Background |
| `wait` / `wait $!` | Wait for background jobs |
| `trap 'cleanup' EXIT` | Run on script exit |
| `trap 'echo interrupted; exit 1' INT TERM` | Run on signal |

**Exit codes — meaning by convention:**

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | General error |
| 2 | Misuse / bad CLI args |
| 126 | Command found but not executable |
| 127 | Command not found |
| 128+N | Killed by signal N (e.g., 130 = Ctrl-C / SIGINT) |
| 255 | Out-of-range exit |

**Argument parsing — keep it simple:**

| Form | Use |
|---|---|
| `$1 $2 ...` | Positional |
| `"$@"` | All args, properly quoted |
| `shift` | Drop first arg |
| `getopts "f:hv"` (POSIX) | Short flags only |
| `while [[ $# -gt 0 ]]; do case $1 in --foo) ... ;; ... esac; shift; done` | Long flags + positional |
| Argbash / `argparse-shell` | Code generators if you need real CLI |

**Error handling pattern:**

```bash
die() { echo "ERROR: $*" >&2; exit 1; }
require() { command -v "$1" >/dev/null 2>&1 || die "missing: $1"; }
require docker
require jq
```

**Cleanup with traps:**

```bash
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT INT TERM
```

> Always clean up temp files. `mktemp -d` + EXIT trap is the canonical pattern.

**Retry with backoff:**

```bash
for i in 1 2 3 4 5; do
  curl -fsS "$url" && break || sleep $((2 ** i))
done
```

**Text-processing essentials (and what each is best at):**

| Tool | Best for | Example |
|---|---|---|
| `grep` | Pattern search | `grep -RE 'pattern' src/` |
| `grep -F` | Fixed-string (faster) | `grep -F "literal" file` |
| `grep -v` | Invert | `grep -v '^#'` |
| `sort` | Sort lines | `sort -u`, `sort -n`, `sort -k2,2` |
| `uniq` | Adjacent-dup collapse (after sort) | `sort \| uniq -c \| sort -rn` |
| `cut` | Field extraction | `cut -d: -f1 /etc/passwd` |
| `tr` | Char translation | `tr 'A-Z' 'a-z'` |
| `awk` | Field-aware processing | `awk -F, '$3 > 100 {print $1}'` |
| `sed` | Stream substitution | `sed 's/old/new/g'` |
| `jq` | JSON | `jq '.items[].name'` |
| `yq` (mikefarah) | YAML | `yq '.spec.replicas'` |
| `xargs` | Build commands from stdin | `find . -name '*.log' \| xargs gzip` (use `xargs -0` with `-print0` for safety) |
| `find` | File traversal | `find . -name '*.bak' -delete` |
| `head` / `tail` | First / last N | `tail -f log` |
| `paste` / `join` | Combine streams | `paste a.txt b.txt` |
| `comm` | Compare two sorted files | `comm -12 a b` (lines in both) |
| `printf` | Reliable formatted output | `printf '%-10s %s\n' "$k" "$v"` |

**`find` + `xargs` — safe patterns:**

```bash
# Wrong (breaks on spaces, newlines in filenames):
find . -name '*.log' | xargs rm

# Right:
find . -name '*.log' -print0 | xargs -0 rm
# Or even better:
find . -name '*.log' -delete
# Or:
find . -name '*.log' -exec rm {} +
```

**Common idioms:**

| Idiom | Use |
|---|---|
| `command -v foo >/dev/null` | "Is `foo` installed?" |
| `>/dev/null 2>&1` | Discard stdout + stderr |
| `2>&1 \| tee log` | Log everything (stdout + stderr) |
| `cd "$(dirname "$0")"` | Go to script's directory |
| `script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)` | Robust script dir |
| `if read -t 5 line <&3; then ...` | Read with timeout |
| `[[ "${BASH_VERSION:0:1}" -ge 4 ]]` | Require Bash 4+ |
| `mapfile -t lines < file` | Read whole file into an array |
| `flock /tmp/x.lock cmd` | Single-instance scripts |

**Globbing & `shopt` knobs:**

| `shopt -s` option | Effect |
|---|---|
| `nullglob` | No match → empty (instead of literal pattern) |
| `failglob` | No match → error |
| `globstar` | `**` matches across dirs |
| `nocaseglob` | Case-insensitive globs |
| `extglob` | Extended patterns: `!(x)`, `?(x)`, `+(x)`, `*(x)`, `@(x)` |
| `dotglob` | Include dotfiles |

**Heredocs and herestrings:**

```bash
cat <<EOF
multi-line
$expanded
EOF

cat <<'EOF'    # quotes prevent expansion
$literal_text
EOF

cmd <<<"$single_line_input"
```

**Process substitution — when piping isn't enough:**

```bash
diff <(sort a.txt) <(sort b.txt)         # diff two sorted streams
while read -r x; do ...; done < <(cmd)   # avoid subshell from `cmd | while ...`
```

> `cmd | while ...; done` runs the loop in a **subshell** — variables set inside don't survive. Use `< <(cmd)` instead when you need to mutate state in the loop.

**Common pitfalls:**

| Pitfall | Effect |
|---|---|
| Unquoted `$var` | Word splitting + glob expansion |
| `[ ]` instead of `[[ ]]` | Less robust; legacy |
| Forgot `set -euo pipefail` | Errors silently ignored |
| `for x in $(cmd)` | Word-splits the output unexpectedly |
| `cmd \| while read x` | Subshell — variables don't persist |
| `read` without `-r` | Backslash mangling |
| `find ... \| xargs` without `-print0`/`-0` | Breaks on funky filenames |
| `cd $dir` instead of `cd "$dir" \|\| exit` | Silent failure |
| `rm -rf $foo/$bar` (unquoted, possibly empty) | Catastrophe — quote and validate |
| Using `eval` | Code injection risk; almost always avoidable |
| Not using `trap` for cleanup | Leftover temp files |
| Hardcoded paths assuming `pwd` | Use `BASH_SOURCE` / `script_dir` |

**Tools to keep your scripts honest:**

| Tool | Why |
|---|---|
| `shellcheck` | The lint you must run; catches most pitfalls above |
| `shfmt` | Auto-format |
| `bats-core` | Unit tests for shell scripts |
| `set -x` | Trace mode for debugging |
| `bash -n script.sh` | Syntax check without running |
| `caller` / `BASH_SOURCE` | Stack info for error reporting |

**When NOT to use bash:**

| Need | Use instead |
|---|---|
| Anything > ~100 lines with real logic | Python / Go / Ruby |
| Concurrency that's more than `&` + `wait` | Real language with async |
| JSON manipulation beyond `jq` | Python |
| Cross-platform Windows + Linux | PowerShell or pwsh |
| Testable business logic | Real language with proper test framework |

**Rule of thumb:** **always `set -euo pipefail`**, **always quote `"$var"`**, **always `[[ ]]`** over `[ ]`, **always `shellcheck`**. Use bash for **glue, automation, deploy scripts** — switch to a real language the moment your script has data structures, error handling beyond exit codes, or concurrency. **Heredocs and process substitution** beat layered pipes when you need state. **`mktemp -d` + `trap EXIT`** for any temp files.
