### Regex / Regular Expression Cheat Sheet

**Atoms — the smallest building blocks:**

| Pattern | Meaning |
|---|---|
| `abc` | Literal text |
| `.` | Any single char (except newline, unless dotall flag) |
| `\` | Escape next char or start a sequence |
| `[abc]` | One of `a`, `b`, `c` (character class) |
| `[^abc]` | Any char except `a`, `b`, `c` |
| `[a-z]` / `[A-Z]` / `[0-9]` | Range inside class |
| `[a-zA-Z0-9_]` | Same as `\w` |

**Shorthand character classes:**

| Class | Means | Inverse |
|---|---|---|
| `\d` | Digit `[0-9]` | `\D` |
| `\w` | Word char `[A-Za-z0-9_]` | `\W` |
| `\s` | Whitespace (space, tab, newline) | `\S` |
| `\h` (some engines) | Horizontal whitespace | `\H` |
| `[[:alpha:]]` (POSIX) | Letters | `[[:^alpha:]]` |
| `[[:digit:]]` | Digits | |
| `[[:space:]]` | Whitespace | |
| `[[:alnum:]]` | Letters + digits | |
| `[[:punct:]]` | Punctuation | |

**Anchors — position, not characters:**

| Anchor | Matches |
|---|---|
| `^` | Start of line (or string when no multiline flag) |
| `$` | End of line (or string) |
| `\A` | Start of **string** (regardless of multiline) |
| `\z` | End of string |
| `\Z` | End of string, or just before final newline |
| `\b` | Word boundary (between `\w` and `\W`/edge) |
| `\B` | Not a word boundary |
| `(?=…)` | Lookahead — position followed by `…` |
| `(?!…)` | Negative lookahead |
| `(?<=…)` | Lookbehind — position preceded by `…` |
| `(?<!…)` | Negative lookbehind |

**Quantifiers — how many:**

| Quantifier | Means |
|---|---|
| `*` | Zero or more (greedy) |
| `+` | One or more |
| `?` | Zero or one (optional) |
| `{n}` | Exactly `n` |
| `{n,}` | `n` or more |
| `{n,m}` | Between `n` and `m` |

**Greedy vs lazy vs possessive:**

| Form | Behavior | Backtracks? |
|---|---|---|
| `.*`, `.+`, `.?` | **Greedy** — match as much as possible | Yes — gives back to satisfy the rest |
| `.*?`, `.+?`, `.??` | **Lazy** — match as little as possible | Yes — extends if needed |
| `.*+`, `.++`, `.?+` (PCRE/Java) | **Possessive** — match max and **never give back** | **No** — fast, prevents catastrophic backtracking |
| Atomic group `(?>…)` | Once matched, never reconsidered | No |

> Possessive / atomic forms exist specifically to **prevent catastrophic backtracking** (regex DoS) on patterns like `(a+)+b`.

**Groups:**

| Form | Effect |
|---|---|
| `(abc)` | Capturing group; numbered `\1`, `\2`, ... |
| `(?:abc)` | Non-capturing group (no number, no overhead) |
| `(?<name>abc)` / `(?P<name>abc)` | Named capture |
| `\1` / `\k<name>` | Backreference |
| `(?:a\|b\|c)` | Alternation inside non-capturing group (the common idiom) |

**Alternation `|` — lowest precedence:**

| Pattern | Matches |
|---|---|
| `a\|b` | `a` or `b` |
| `cat\|dog` | `cat` or `dog` |
| `(cat\|dog)s` | `cats` or `dogs` (group anchors the split) |
| `cat\|dogs` | `cat` or `dogs` (no group — careful with precedence) |

**Lookaround — match position, not consumed text:**

| Form | Use |
|---|---|
| `(?=…)` lookahead | "Followed by …" without consuming |
| `(?!…)` negative lookahead | "Not followed by …" |
| `(?<=…)` lookbehind | "Preceded by …" |
| `(?<!…)` negative lookbehind | "Not preceded by …" |

> Some engines (Go's RE2, JS pre-ES2018) restrict or forbid lookbehind. Always check engine support.

**Flags / modifiers:**

| Flag | Effect |
|---|---|
| `i` | Case-insensitive |
| `m` | Multiline — `^` `$` match per line |
| `s` | Dot-all — `.` matches newline |
| `x` | Extended — ignore whitespace + allow `# comments` |
| `g` (JS / sed) | Global — match all occurrences |
| `u` | Unicode — `\w` includes Unicode letters |

**Inline flag scoping:** `(?i)abc` enables `i` from here onward; `(?i:abc)` enables only inside the group.

**Engine flavor differences (the ones that bite):**

| Feature | PCRE / Java / .NET / Python `re` | RE2 (Go, RE2-backed) | JavaScript |
|---|---|---|---|
| Backtracking | ✅ | ❌ — guaranteed linear time | ✅ |
| Lookahead | ✅ | ✅ | ✅ |
| Lookbehind | ✅ | ❌ | ES2018+ ✅ |
| Backreferences | ✅ | ❌ | ✅ |
| Atomic / possessive | ✅ | n/a | ❌ (no need) |
| Named capture | ✅ | ✅ | ✅ |
| Recursion `(?R)` | ✅ (PCRE) | ❌ | ❌ |

> If you need guaranteed-linear time and no ReDoS risk, use **RE2**. If you need full power, PCRE/Java/.NET — but mind catastrophic backtracking.

**Common pattern recipes:**

| Goal | Pattern |
|---|---|
| One or more digits | `\d+` |
| Whole-string capitalized word | `^[A-Z][a-z]+$` |
| Simple email-shaped | `^[\w.+-]+@[\w-]+\.[\w.-]+$` (validation is harder than this — use a library) |
| URL (HTTP/S) | `^https?://[^\s/$.?#].[^\s]*$` |
| IPv4 octet | `(25[0-5]\|2[0-4]\d\|[01]?\d\d?)` |
| Whole IPv4 | `^(25[0-5]\|2[0-4]\d\|[01]?\d\d?)(\.(25[0-5]\|2[0-4]\d\|[01]?\d\d?)){3}$` |
| Trim leading/trailing whitespace | replace `^\s+\|\s+$` with empty |
| Collapse multiple spaces | replace `\s+` with single space |
| Whole word (avoid substrings) | `\bword\b` |
| Match between markers | `START(.*?)END` (lazy) |
| Hex color | `^#(?:[0-9a-fA-F]{3}\|[0-9a-fA-F]{6})$` |
| ISO date `YYYY-MM-DD` | `^\d{4}-\d{2}-\d{2}$` |
| UUID | `^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$` |
| Optional capture (group only when present) | `(?:price=(\d+))?` |

**Substitution / replacement:**

| Form | Effect |
|---|---|
| `$1`, `$2` (most engines) | Backreference in replacement |
| `\1`, `\2` (sed, Ruby) | Same |
| `${name}` (Python, .NET) | Named capture in replacement |
| `&` / `$&` | The whole match |
| Case modifiers (sed/Perl): `\U`, `\L`, `\E` | Uppercase / lowercase the next chars in replacement |

**Performance — what causes catastrophic backtracking:**

| Anti-pattern | Why it explodes |
|---|---|
| `(a+)+` on a long string of `a`'s with one mismatch | Exponential paths |
| `(a\|a)+` | Same — overlapping alternatives |
| `(.*)*` | Same |
| Nested unbounded quantifiers | Same |
| Lookaheads with capturing | Slow, plus may interact poorly |

**Defenses against ReDoS:**

| Defense | Detail |
|---|---|
| Use **possessive quantifiers** or **atomic groups** to disable backtracking | `(a++)+b` |
| Anchor the pattern (`^...$`) | Limits where the engine starts |
| Bound the quantifier (`a{1,100}`) | Hard cap |
| Use **RE2** if available | Guaranteed linear time |
| Cap input length before regex | Trim before matching |
| Test patterns with adversarial inputs | Long runs of repeated chars |

**Validation vs parsing:**

| Goal | Use regex? |
|---|---|
| Quick shape check ("looks like a number") | ✅ |
| Tokenize a known simple grammar | ✅ |
| Parse HTML / JSON / XML / a real grammar | ❌ — use a real parser |
| Validate emails per RFC 5322 | ❌ — use a library |
| Strip / normalize whitespace | ✅ |
| Find all matches in a stream | ✅ (use the engine's iterator API) |

**Common gotchas:**

| Gotcha | Fix |
|---|---|
| `.` doesn't match newline | Add dotall (`s` flag) or use `[\s\S]` |
| `^` / `$` don't match per line | Add multiline (`m`) |
| `\d` matches Unicode digits in some engines (e.g. Python `\d`) | Use `[0-9]` if you want ASCII |
| `\b` requires `\w` on at least one side | Won't match `[`/`]` boundaries unless redefined |
| Capturing groups change replacement numbering | Switch to non-capturing `(?:…)` |
| Greedy `.*` swallows too much | Use lazy `.*?` or a constrained class |
| Pattern works in test, fails in code | Different engine; check shorthand class semantics |
| Forgetting to escape `.`, `+`, `?`, `(`, `)`, `[`, `]`, `{`, `}` in literal contexts | Escape them: `\.`, `\+`, ... |
| Pasting Unicode / smart quotes | Hard to spot; normalize input first |

**Building a regex — the disciplined recipe:**

| Step | Do |
|---|---|
| 1. Anchor it | `^` ... `$` if you want whole-string |
| 2. Define the alphabet | Explicit classes — `[A-Za-z0-9_-]` over `.` |
| 3. Quantify minimally | `{1,40}` instead of `+` for length-bounded fields |
| 4. Group what you need to capture | Named captures over numbered |
| 5. Test with edge cases | Empty, max length, special chars, Unicode |
| 6. Test pathological inputs | `aaaaaaaaaaaaaaaaaaaaaaab` to detect ReDoS |
| 7. Profile if it runs in a hot loop | Different patterns, same result, big perf delta |

**Tools:**

| Tool | Use |
|---|---|
| regex101.com | Live tester with engine selection + explanation |
| regexr.com | Same niche, different UX |
| `re --debug` (Python) | See parsed AST |
| `pcretest` / `pcre2test` | CLI for PCRE |
| `re2 ::Set` (Go) | Compile many patterns once |
| `safe-regex` (npm) | Static check for ReDoS-prone patterns |

**Rule of thumb:** **build regex from small parts** — anchor, define the alphabet, quantify just enough. **Use named captures** over numbered, **non-capturing groups** when you don't need the value, and **possessive / atomic groups** to prevent catastrophic backtracking. For untrusted input or guaranteed-linear time, **prefer RE2**. For HTML / JSON / real grammars, **use a parser, not a regex**.
